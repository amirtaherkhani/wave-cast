package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/infra/centrifugo"
	"github.com/amirtaherkhani/wave-cast/internal/infra/kafka"
	"github.com/amirtaherkhani/wave-cast/internal/infra/livekit"
	"github.com/amirtaherkhani/wave-cast/internal/infra/mediaorigin"
	"github.com/amirtaherkhani/wave-cast/internal/infra/memory"
	mongostore "github.com/amirtaherkhani/wave-cast/internal/infra/mongo"
	"github.com/amirtaherkhani/wave-cast/internal/platform/logger"
	httptransport "github.com/amirtaherkhani/wave-cast/internal/transport/http"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env).With("service", cfg.ServiceName)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	store, closeStore := newStore(ctx, cfg, log)
	if closeStore != nil {
		defer closeStore()
	}
	eventBus := newEventBus(ctx, cfg, log)
	if closer, ok := eventBus.(interface{ Close() }); ok {
		defer closer.Close()
	}

	service := voiceapp.NewService(
		store,
		eventBus,
		livekit.NewTokenIssuer(cfg.LiveKit.URL, cfg.LiveKit.APIKey, cfg.LiveKit.APISecret, cfg.LiveKit.TokenTTL),
		centrifugo.NewTokenIssuer(cfg.Centrifugo.TokenSecret, cfg.Centrifugo.ConnectionTokenTTL, cfg.Centrifugo.SubscriptionTTL),
		mediaorigin.NewBuilder(cfg.Media),
		log,
		voiceapp.ServiceConfig{
			RealtimeURL:            cfg.Centrifugo.URL,
			HeartbeatInterval:      cfg.Listener.HeartbeatInterval,
			RecordingEnabled:       cfg.Recording.Enabled,
			RecordingRetentionDays: cfg.Recording.RetentionDays,
			S3Bucket:               cfg.S3.Bucket,
			S3Region:               cfg.S3.Region,
			S3RecordingsPrefix:     cfg.S3.RecordingsPrefix,
		},
	)

	handler := httptransport.NewRouter(service, log, cfg.HTTP.AllowedOrigins)
	server := &http.Server{
		Addr:              cfg.HTTP.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Info("api listening", "addr", cfg.HTTP.Addr, "storage_driver", cfg.StorageDriver, "kafka_enabled", cfg.Kafka.Enabled)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("api server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("api shutdown failed", "error", err)
		os.Exit(1)
	}
	log.Info("api stopped")
}

func newEventBus(ctx context.Context, cfg config.Config, log *slog.Logger) voiceapp.EventBus {
	if !cfg.Kafka.Enabled {
		return kafka.NewNoopEventBus(log)
	}
	bus, err := kafka.NewEventBus(cfg.Kafka.Brokers, cfg.Kafka.ClientID, cfg.Kafka.VoiceEvents, log)
	if err != nil {
		log.ErrorContext(ctx, "kafka event bus unavailable; falling back to noop", "error", err)
		return kafka.NewNoopEventBus(log)
	}
	return bus
}

func newStore(ctx context.Context, cfg config.Config, log *slog.Logger) (voiceapp.Store, func()) {
	switch cfg.StorageDriver {
	case "mongo", "mongodb":
		store, err := mongostore.Connect(ctx, cfg.Mongo)
		if err != nil {
			log.ErrorContext(ctx, "mongo store unavailable", "error", err, "mongo_uri", cfg.Mongo.URI, "database", cfg.Mongo.Database)
			os.Exit(1)
		}
		log.InfoContext(ctx, "mongo store connected", "database", cfg.Mongo.Database)
		return store, func() {
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := store.Disconnect(shutdownCtx); err != nil {
				log.Error("mongo disconnect failed", "error", err)
			}
		}
	default:
		log.InfoContext(ctx, "using in-memory store")
		return memory.NewStore(), nil
	}
}

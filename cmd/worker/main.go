package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/config"
	coreasync "github.com/amirtaherkhani/wave-cast/internal/core/async"
	"github.com/amirtaherkhani/wave-cast/internal/infra/centrifugo"
	"github.com/amirtaherkhani/wave-cast/internal/infra/kafka"
	"github.com/amirtaherkhani/wave-cast/internal/infra/livekit"
	"github.com/amirtaherkhani/wave-cast/internal/infra/mediaorigin"
	"github.com/amirtaherkhani/wave-cast/internal/infra/memory"
	mongostore "github.com/amirtaherkhani/wave-cast/internal/infra/mongo"
	redisinfra "github.com/amirtaherkhani/wave-cast/internal/infra/redis"
	"github.com/amirtaherkhani/wave-cast/internal/platform/logger"
	"github.com/amirtaherkhani/wave-cast/internal/worker/asyncjobs"
	"github.com/amirtaherkhani/wave-cast/internal/worker/scheduler"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env).With("service", "wave-cast-worker")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if !cfg.Async.WorkerEnabled {
		log.Info("worker disabled by config")
		<-ctx.Done()
		return
	}

	store, asyncStore, closeStore := newWorkerStore(ctx, cfg, log)
	if closeStore != nil {
		defer closeStore()
	}
	presence, closePresence := newWorkerPresence(ctx, cfg, log)
	if closePresence != nil {
		defer closePresence()
	}
	eventBus := newWorkerEventBus(ctx, cfg, log)
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
			ListenerSessionTimeout: cfg.Listener.SessionTimeout,
			RecordingEnabled:       cfg.Recording.Enabled,
			RecordingRetentionDays: cfg.Recording.RetentionDays,
			S3Bucket:               cfg.S3.Bucket,
			S3Region:               cfg.S3.Region,
			S3RecordingsPrefix:     cfg.S3.RecordingsPrefix,
			S3PresignedURLTTL:      cfg.S3.PresignedURLTTL,
		},
	)
	service.SetPresenceStore(presence)

	queue := coreasync.NewQueue(asyncStore, asyncConfig(cfg))
	service.SetJobQueue(queue)
	runner := coreasync.NewRunner(queue, "worker_"+hostname(), log)
	asyncjobs.NewRegistry(service, log, cfg.Listener.SessionTimeout).Register(runner)

	if cfg.Async.SchedulerEnabled {
		go scheduler.New(queue, log, cfg.Async.ExpireListenerSessionsInterval).Run(ctx)
	}
	log.Info("worker started", "concurrency", cfg.Async.WorkerConcurrency, "scheduler_enabled", cfg.Async.SchedulerEnabled)
	_ = runner.Run(ctx)
	log.Info("worker stopped")
}

func newWorkerStore(ctx context.Context, cfg config.Config, log *slog.Logger) (voiceapp.Store, coreasync.Store, func()) {
	switch cfg.StorageDriver {
	case "mongo", "mongodb":
		store, err := mongostore.Connect(ctx, cfg.Mongo)
		if err != nil {
			log.ErrorContext(ctx, "mongo store unavailable", "error", err)
			os.Exit(1)
		}
		return store, store.AsyncJobStore(), func() {
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := store.Disconnect(shutdownCtx); err != nil {
				log.Error("mongo disconnect failed", "error", err)
			}
		}
	default:
		return memory.NewStore(), coreasync.NewMemoryStore(), nil
	}
}

func newWorkerPresence(ctx context.Context, cfg config.Config, log *slog.Logger) (voiceapp.PresenceStore, func()) {
	if !cfg.Redis.Enabled {
		return redisinfra.NewNoopPresenceStore(), nil
	}
	client, err := redisinfra.Connect(ctx, cfg.Redis)
	if err != nil {
		log.ErrorContext(ctx, "redis unavailable", "error", err, "addr", cfg.Redis.Addr)
		os.Exit(1)
	}
	return redisinfra.NewPresenceStore(client), func() {
		if err := client.Close(); err != nil {
			log.Error("redis close failed", "error", err)
		}
	}
}

func newWorkerEventBus(ctx context.Context, cfg config.Config, log *slog.Logger) voiceapp.EventBus {
	if !cfg.Kafka.Enabled {
		return kafka.NewNoopEventBus(log)
	}
	bus, err := kafka.NewEventBus(cfg.Kafka.Brokers, cfg.Kafka.ClientID+"-worker", cfg.Kafka.VoiceEvents, log)
	if err != nil {
		log.ErrorContext(ctx, "kafka event bus unavailable; falling back to noop", "error", err)
		return kafka.NewNoopEventBus(log)
	}
	return bus
}

func asyncConfig(cfg config.Config) coreasync.Config {
	return coreasync.Config{
		WorkerConcurrency: cfg.Async.WorkerConcurrency,
		JobMaxAttempts:    cfg.Async.JobMaxAttempts,
		VisibilityTimeout: cfg.Async.JobVisibilityTimeout,
		RetryBaseDelay:    cfg.Async.JobRetryBaseDelay,
		RetryMaxDelay:     cfg.Async.JobRetryMaxDelay,
		DeadLetterEnabled: cfg.Async.JobDeadLetterEnabled,
		PollInterval:      time.Second,
	}
}

func hostname() string {
	name, err := os.Hostname()
	if err != nil || name == "" {
		return "local"
	}
	return name
}

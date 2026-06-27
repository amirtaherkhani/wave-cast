package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/infra/centrifugo"
	"github.com/amirtaherkhani/wave-cast/internal/platform/logger"
	"github.com/amirtaherkhani/wave-cast/internal/worker/dispatcher"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env).With("service", "wave-cast-realtime-dispatcher")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if !cfg.Kafka.Enabled {
		log.Error("realtime dispatcher requires kafka", "kafka_enabled", cfg.Kafka.Enabled)
		os.Exit(1)
	}
	publisher := centrifugo.NewPublisher(cfg.Centrifugo.URL, cfg.Centrifugo.APIKey)
	dispatcher, err := dispatcher.NewKafkaDispatcher(
		cfg.Kafka.Brokers,
		cfg.Kafka.ClientID+"-realtime-dispatcher",
		cfg.Kafka.ClientID+"-realtime-dispatcher",
		cfg.Kafka.VoiceEvents,
		publisher,
		log,
	)
	if err != nil {
		log.Error("realtime dispatcher init failed", "error", err)
		os.Exit(1)
	}
	defer dispatcher.Close()

	log.Info("realtime dispatcher started", "kafka_topic", cfg.Kafka.VoiceEvents, "centrifugo_url", cfg.Centrifugo.URL)
	if err := dispatcher.Run(ctx); err != nil {
		log.Error("realtime dispatcher failed", "error", err)
		os.Exit(1)
	}
	log.Info("realtime dispatcher stopped")
}

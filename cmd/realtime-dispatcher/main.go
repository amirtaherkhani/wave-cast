package main

import (
	"context"
	"os/signal"
	"syscall"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/platform/logger"
)

func main() {
	cfg := config.Load()
	log := logger.New(cfg.Env).With("service", "wave-cast-realtime-dispatcher")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	log.Info("realtime dispatcher started", "kafka_topic", cfg.Kafka.VoiceEvents, "centrifugo_url", cfg.Centrifugo.URL)
	for {
		select {
		case <-ctx.Done():
			log.Info("realtime dispatcher stopped")
			return
		case <-ticker.C:
			log.Info("realtime dispatcher heartbeat")
		}
	}
}

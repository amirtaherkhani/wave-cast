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
	log := logger.New(cfg.Env).With("service", "wave-cast-worker")

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	log.Info("worker started", "jobs", []string{
		"generate_room_report",
		"finalize_recording",
		"expire_recording",
		"expire_listener_session",
		"process_livekit_webhook",
	})
	for {
		select {
		case <-ctx.Done():
			log.Info("worker stopped")
			return
		case <-ticker.C:
			log.Info("worker heartbeat")
		}
	}
}

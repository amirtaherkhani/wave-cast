package scheduler

import (
	"context"
	"log/slog"
	"time"

	coreasync "github.com/amirtaherkhani/wave-cast/internal/core/async"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type Scheduler struct {
	queue    *coreasync.Queue
	logger   *slog.Logger
	interval time.Duration
}

func New(queue *coreasync.Queue, logger *slog.Logger, expireListenerInterval time.Duration) *Scheduler {
	if expireListenerInterval <= 0 {
		expireListenerInterval = 30 * time.Second
	}
	return &Scheduler{queue: queue, logger: logger, interval: expireListenerInterval}
}

func (s *Scheduler) Run(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			idempotencyKey := "scheduler:expire_stale_listener_sessions:" + now.UTC().Format("20060102150405")
			if err := s.queue.Enqueue(ctx, string(voice.JobExpireListenerSession), idempotencyKey, map[string]any{"scheduledAt": now.UTC()}); err != nil {
				s.logger.ErrorContext(ctx, "scheduled job enqueue failed", "component", "async_scheduler", "job_type", voice.JobExpireListenerSession, "error", err)
			}
		}
	}
}

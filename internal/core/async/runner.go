package async

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"
)

type Runner struct {
	queue    *Queue
	workerID string
	logger   *slog.Logger
	handlers map[string]Handler
}

func NewRunner(queue *Queue, workerID string, logger *slog.Logger) *Runner {
	return &Runner{
		queue:    queue,
		workerID: workerID,
		logger:   logger,
		handlers: map[string]Handler{},
	}
}

func (r *Runner) Handle(jobType string, handler Handler) {
	r.handlers[jobType] = handler
}

func (r *Runner) Run(ctx context.Context) error {
	if r.queue == nil || r.queue.store == nil {
		return errors.New("async runner requires queue store")
	}
	var wg sync.WaitGroup
	for i := 0; i < r.queue.cfg.WorkerConcurrency; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r.loop(ctx)
		}()
	}
	<-ctx.Done()
	wg.Wait()
	return nil
}

func (r *Runner) loop(ctx context.Context) {
	ticker := time.NewTicker(r.queue.cfg.PollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.processOnce(ctx)
		}
	}
}

func (r *Runner) processOnce(ctx context.Context) {
	now := time.Now().UTC()
	job, err := r.queue.store.ClaimNext(ctx, r.workerID, now, r.queue.cfg.VisibilityTimeout)
	if err != nil {
		r.logger.ErrorContext(ctx, "async claim failed", "component", "async_worker", "operation", "claim_next", "error", err)
		return
	}
	if job == nil {
		return
	}

	start := time.Now()
	log := r.logger.With(
		"component", "async_worker",
		"operation", job.Type,
		"job_id", job.ID,
		"job_type", job.Type,
		"attempt", job.Attempts,
		"max_attempts", job.MaxAttempts,
	)
	log.InfoContext(ctx, "background job started")

	handler := r.handlers[job.Type]
	if handler == nil {
		r.fail(ctx, job, "handler not registered")
		return
	}
	if err := handler(ctx, job); err != nil {
		r.fail(ctx, job, err.Error())
		return
	}
	if err := r.queue.store.Complete(ctx, job.ID, time.Now().UTC()); err != nil {
		log.ErrorContext(ctx, "background job completion failed", "error", err)
		return
	}
	log.InfoContext(ctx, "background job completed", "duration_ms", time.Since(start).Milliseconds())
}

func (r *Runner) fail(ctx context.Context, job *Job, message string) {
	now := time.Now().UTC()
	log := r.logger.With("component", "async_worker", "operation", job.Type, "job_id", job.ID, "job_type", job.Type, "attempt", job.Attempts)
	if job.Attempts >= job.MaxAttempts {
		if r.queue.cfg.DeadLetterEnabled {
			if err := r.queue.store.DeadLetter(ctx, job.ID, message, now); err != nil {
				log.ErrorContext(ctx, "background job dead-letter failed", "error", err)
			}
			log.ErrorContext(ctx, "background job moved to dead letter", "error", message)
			return
		}
		if err := r.queue.store.DeadLetter(ctx, job.ID, message, now); err != nil {
			log.ErrorContext(ctx, "background job failed-state update failed", "error", err)
		}
		return
	}

	delay := retryDelay(job.Attempts, r.queue.cfg.RetryBaseDelay, r.queue.cfg.RetryMaxDelay)
	if err := r.queue.store.Retry(ctx, job.ID, now.Add(delay), message, now); err != nil {
		log.ErrorContext(ctx, "background job retry scheduling failed", "error", err)
		return
	}
	log.WarnContext(ctx, "background job retry scheduled", "retry_in_ms", delay.Milliseconds(), "error", message)
}

func retryDelay(attempt int, base, max time.Duration) time.Duration {
	if attempt <= 0 {
		return base
	}
	delay := base << min(attempt-1, 10)
	if delay > max {
		return max
	}
	return delay
}

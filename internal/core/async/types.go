package async

import (
	"context"
	"encoding/json"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/platform/ids"
)

type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusRunning    JobStatus = "running"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusRetrying   JobStatus = "retrying"
	JobStatusFailed     JobStatus = "failed"
	JobStatusDeadLetter JobStatus = "dead_letter"
	JobStatusCancelled  JobStatus = "cancelled"
)

type Job struct {
	ID             string          `json:"id" bson:"_id"`
	Type           string          `json:"type" bson:"type"`
	Status         JobStatus       `json:"status" bson:"status"`
	IdempotencyKey string          `json:"idempotencyKey" bson:"idempotencyKey"`
	Payload        json.RawMessage `json:"payload" bson:"payload"`
	Attempts       int             `json:"attempts" bson:"attempts"`
	MaxAttempts    int             `json:"maxAttempts" bson:"maxAttempts"`
	LockedBy       string          `json:"lockedBy,omitempty" bson:"lockedBy,omitempty"`
	LockedUntil    *time.Time      `json:"lockedUntil,omitempty" bson:"lockedUntil,omitempty"`
	RunAfter       time.Time       `json:"runAfter" bson:"runAfter"`
	LastError      string          `json:"lastError,omitempty" bson:"lastError,omitempty"`
	FailedAt       *time.Time      `json:"failedAt,omitempty" bson:"failedAt,omitempty"`
	CreatedAt      time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt" bson:"updatedAt"`
}

type Config struct {
	WorkerConcurrency int
	JobMaxAttempts    int
	VisibilityTimeout time.Duration
	RetryBaseDelay    time.Duration
	RetryMaxDelay     time.Duration
	DeadLetterEnabled bool
	PollInterval      time.Duration
}

type Store interface {
	Enqueue(ctx context.Context, job *Job) error
	ClaimNext(ctx context.Context, workerID string, now time.Time, visibilityTimeout time.Duration) (*Job, error)
	Complete(ctx context.Context, jobID string, now time.Time) error
	Retry(ctx context.Context, jobID string, nextRun time.Time, lastError string, now time.Time) error
	DeadLetter(ctx context.Context, jobID string, lastError string, now time.Time) error
}

type Handler func(context.Context, *Job) error

type Queue struct {
	store Store
	cfg   Config
}

func NewQueue(store Store, cfg Config) *Queue {
	if cfg.JobMaxAttempts <= 0 {
		cfg.JobMaxAttempts = 5
	}
	if cfg.VisibilityTimeout <= 0 {
		cfg.VisibilityTimeout = 5 * time.Minute
	}
	if cfg.RetryBaseDelay <= 0 {
		cfg.RetryBaseDelay = 5 * time.Second
	}
	if cfg.RetryMaxDelay <= 0 {
		cfg.RetryMaxDelay = 5 * time.Minute
	}
	if cfg.PollInterval <= 0 {
		cfg.PollInterval = time.Second
	}
	if cfg.WorkerConcurrency <= 0 {
		cfg.WorkerConcurrency = 1
	}
	return &Queue{store: store, cfg: cfg}
}

func (q *Queue) Enqueue(ctx context.Context, jobType string, idempotencyKey string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	job := &Job{
		ID:             ids.New(ids.PrefixJob),
		Type:           jobType,
		Status:         JobStatusPending,
		IdempotencyKey: idempotencyKey,
		Payload:        raw,
		Attempts:       0,
		MaxAttempts:    q.cfg.JobMaxAttempts,
		RunAfter:       now,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	return q.store.Enqueue(ctx, job)
}

func DecodePayload[T any](job *Job) (T, error) {
	var payload T
	err := json.Unmarshal(job.Payload, &payload)
	return payload, err
}

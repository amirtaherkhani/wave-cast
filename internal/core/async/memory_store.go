package async

import (
	"context"
	"sync"
	"time"
)

type MemoryStore struct {
	mu      sync.Mutex
	jobs    map[string]*Job
	byIDKey map[string]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		jobs:    map[string]*Job{},
		byIDKey: map[string]string{},
	}
}

func (s *MemoryStore) Enqueue(_ context.Context, job *Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if existingID := s.byIDKey[job.IdempotencyKey]; existingID != "" {
		existing := s.jobs[existingID]
		if existing != nil && existing.Status != JobStatusDeadLetter && existing.Status != JobStatusFailed {
			return nil
		}
	}
	copy := *job
	s.jobs[job.ID] = &copy
	s.byIDKey[job.IdempotencyKey] = job.ID
	return nil
}

func (s *MemoryStore) ClaimNext(_ context.Context, workerID string, now time.Time, visibilityTimeout time.Duration) (*Job, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, job := range s.jobs {
		if !readyToClaim(job, now) {
			continue
		}
		job.Status = JobStatusRunning
		job.Attempts++
		job.LockedBy = workerID
		lockedUntil := now.Add(visibilityTimeout)
		job.LockedUntil = &lockedUntil
		job.UpdatedAt = now
		copy := *job
		return &copy, nil
	}
	return nil, nil
}

func (s *MemoryStore) Complete(_ context.Context, jobID string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if job := s.jobs[jobID]; job != nil {
		job.Status = JobStatusCompleted
		job.LockedBy = ""
		job.LockedUntil = nil
		job.UpdatedAt = now
	}
	return nil
}

func (s *MemoryStore) Retry(_ context.Context, jobID string, nextRun time.Time, lastError string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if job := s.jobs[jobID]; job != nil {
		job.Status = JobStatusRetrying
		job.RunAfter = nextRun
		job.LastError = lastError
		job.LockedBy = ""
		job.LockedUntil = nil
		job.UpdatedAt = now
	}
	return nil
}

func (s *MemoryStore) DeadLetter(_ context.Context, jobID string, lastError string, now time.Time) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if job := s.jobs[jobID]; job != nil {
		job.Status = JobStatusDeadLetter
		job.LastError = lastError
		job.FailedAt = &now
		job.LockedBy = ""
		job.LockedUntil = nil
		job.UpdatedAt = now
	}
	return nil
}

func readyToClaim(job *Job, now time.Time) bool {
	if job.RunAfter.After(now) {
		return false
	}
	if job.Status != JobStatusPending && job.Status != JobStatusRetrying && job.Status != JobStatusRunning {
		return false
	}
	if job.Status == JobStatusRunning {
		return job.LockedUntil != nil && job.LockedUntil.Before(now)
	}
	return true
}

package redis

import (
	"context"
	"sync"
	"time"
)

type NoopPresenceStore struct {
	mu           sync.Mutex
	listeners    map[string]map[string]struct{}
	participants map[string]map[string]struct{}
}

func NewNoopPresenceStore() *NoopPresenceStore {
	return &NoopPresenceStore{
		listeners:    map[string]map[string]struct{}{},
		participants: map[string]map[string]struct{}{},
	}
}

func (s *NoopPresenceStore) MarkListenerActive(_ context.Context, roomID, sessionID, _ string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.listeners[roomID] == nil {
		s.listeners[roomID] = map[string]struct{}{}
	}
	s.listeners[roomID][sessionID] = struct{}{}
	return nil
}

func (s *NoopPresenceStore) TouchListener(_ context.Context, roomID, sessionID string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.listeners[roomID] == nil {
		s.listeners[roomID] = map[string]struct{}{}
	}
	s.listeners[roomID][sessionID] = struct{}{}
	return nil
}

func (s *NoopPresenceStore) MarkListenerInactive(_ context.Context, roomID, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.listeners[roomID], sessionID)
	return nil
}

func (s *NoopPresenceStore) ActiveListenerCount(_ context.Context, roomID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.listeners[roomID]), nil
}

func (s *NoopPresenceStore) MarkParticipantActive(_ context.Context, roomID, sessionID, _ string, _ time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.participants[roomID] == nil {
		s.participants[roomID] = map[string]struct{}{}
	}
	s.participants[roomID][sessionID] = struct{}{}
	return nil
}

func (s *NoopPresenceStore) MarkParticipantInactive(_ context.Context, roomID, sessionID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.participants[roomID], sessionID)
	return nil
}

func (s *NoopPresenceStore) ActiveParticipantCount(_ context.Context, roomID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.participants[roomID]), nil
}

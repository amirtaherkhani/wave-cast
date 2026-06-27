package redis

import (
	"context"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type PresenceStore struct {
	client *goredis.Client
}

func NewPresenceStore(client *goredis.Client) *PresenceStore {
	return &PresenceStore{client: client}
}

func (s *PresenceStore) MarkListenerActive(ctx context.Context, roomID, sessionID, userID string, ttl time.Duration) error {
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, listenerLastSeenKey(sessionID), time.Now().UTC().Format(time.RFC3339Nano), ttl)
	pipe.HSet(ctx, listenerStateKey(sessionID), map[string]any{
		"roomId": roomID,
		"userId": userID,
		"status": "active",
	})
	pipe.Expire(ctx, listenerStateKey(sessionID), ttl)
	pipe.SAdd(ctx, roomListenersKey(roomID), sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *PresenceStore) TouchListener(ctx context.Context, roomID, sessionID string, ttl time.Duration) error {
	pipe := s.client.TxPipeline()
	pipe.Set(ctx, listenerLastSeenKey(sessionID), time.Now().UTC().Format(time.RFC3339Nano), ttl)
	pipe.Expire(ctx, listenerStateKey(sessionID), ttl)
	pipe.SAdd(ctx, roomListenersKey(roomID), sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *PresenceStore) MarkListenerInactive(ctx context.Context, roomID, sessionID string) error {
	pipe := s.client.TxPipeline()
	pipe.Del(ctx, listenerLastSeenKey(sessionID), listenerStateKey(sessionID))
	pipe.SRem(ctx, roomListenersKey(roomID), sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *PresenceStore) ActiveListenerCount(ctx context.Context, roomID string) (int, error) {
	count, err := s.client.SCard(ctx, roomListenersKey(roomID)).Result()
	return int(count), err
}

func (s *PresenceStore) MarkParticipantActive(ctx context.Context, roomID, sessionID, userID string, ttl time.Duration) error {
	pipe := s.client.TxPipeline()
	pipe.HSet(ctx, participantStateKey(sessionID), map[string]any{
		"roomId": roomID,
		"userId": userID,
		"status": "active",
	})
	pipe.Expire(ctx, participantStateKey(sessionID), ttl)
	pipe.SAdd(ctx, roomParticipantsKey(roomID), sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *PresenceStore) MarkParticipantInactive(ctx context.Context, roomID, sessionID string) error {
	pipe := s.client.TxPipeline()
	pipe.Del(ctx, participantStateKey(sessionID))
	pipe.SRem(ctx, roomParticipantsKey(roomID), sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *PresenceStore) ActiveParticipantCount(ctx context.Context, roomID string) (int, error) {
	count, err := s.client.SCard(ctx, roomParticipantsKey(roomID)).Result()
	return int(count), err
}

func listenerLastSeenKey(sessionID string) string {
	return fmt.Sprintf("listener_session:%s:last_seen", sessionID)
}

func listenerStateKey(sessionID string) string {
	return fmt.Sprintf("listener_session:%s:state", sessionID)
}

func roomListenersKey(roomID string) string {
	return fmt.Sprintf("room:%s:listeners", roomID)
}

func participantStateKey(sessionID string) string {
	return fmt.Sprintf("participant_session:%s:state", sessionID)
}

func roomParticipantsKey(roomID string) string {
	return fmt.Sprintf("room:%s:participants", roomID)
}

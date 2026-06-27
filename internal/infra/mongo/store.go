package mongo

import (
	"context"
	"errors"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	apperrors "github.com/amirtaherkhani/wave-cast/internal/platform/errors"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"go.mongodb.org/mongo-driver/v2/mongo/readpref"
)

type Store struct {
	client *mongo.Client
	db     *mongo.Database
}

func Connect(ctx context.Context, cfg config.MongoConfig) (*Store, error) {
	client, err := mongo.Connect(options.Client().ApplyURI(cfg.URI))
	if err != nil {
		return nil, err
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := client.Ping(pingCtx, readpref.Primary()); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	store := &Store{client: client, db: client.Database(cfg.Database)}
	if err := store.EnsureIndexes(ctx); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}
	return store, nil
}

func (s *Store) Disconnect(ctx context.Context) error {
	return s.client.Disconnect(ctx)
}

func (s *Store) EnsureIndexes(ctx context.Context) error {
	indexes := map[string][]mongo.IndexModel{
		"rooms": {
			{Keys: bson.D{{Key: "status", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "ownerId", Value: 1}, {Key: "createdAt", Value: -1}}},
			{Keys: bson.D{{Key: "livekitRoomName", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		"room_listener_sessions": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "status", Value: 1}}},
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "userId", Value: 1}}},
			{Keys: bson.D{{Key: "status", Value: 1}, {Key: "lastHeartbeatAt", Value: 1}}},
		},
		"room_participant_sessions": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "status", Value: 1}}},
		},
		"speaker_requests": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "userId", Value: 1}, {Key: "status", Value: 1}}},
		},
		"speaking_blocks": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "userId", Value: 1}, {Key: "unblockedAt", Value: 1}}},
		},
		"room_recordings": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "status", Value: 1}}},
		},
		"room_reports": {
			{Keys: bson.D{{Key: "roomId", Value: 1}}, Options: options.Index().SetUnique(true)},
		},
		"room_events": {
			{Keys: bson.D{{Key: "roomId", Value: 1}, {Key: "occurredAt", Value: -1}}},
			{Keys: bson.D{{Key: "eventType", Value: 1}, {Key: "occurredAt", Value: -1}}},
		},
		"async_jobs": {
			{Keys: bson.D{{Key: "status", Value: 1}, {Key: "runAfter", Value: 1}}},
			{Keys: bson.D{{Key: "idempotencyKey", Value: 1}}, Options: options.Index().SetUnique(true)},
			{Keys: bson.D{{Key: "lockedUntil", Value: 1}}},
			{Keys: bson.D{{Key: "type", Value: 1}, {Key: "status", Value: 1}}},
		},
	}
	for collection, models := range indexes {
		if _, err := s.db.Collection(collection).Indexes().CreateMany(ctx, models); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) SaveRoom(ctx context.Context, room *voice.Room) error {
	return s.replace(ctx, "rooms", room.ID, room)
}

func (s *Store) GetRoom(ctx context.Context, roomID string) (*voice.Room, error) {
	var room voice.Room
	if err := s.findOne(ctx, "rooms", bson.M{"_id": roomID}, &room, apperrors.ErrRoomNotFound); err != nil {
		return nil, err
	}
	return &room, nil
}

func (s *Store) SaveListenerSession(ctx context.Context, session *voice.ListenerSession) error {
	return s.replace(ctx, "room_listener_sessions", session.ID, session)
}

func (s *Store) GetListenerSession(ctx context.Context, sessionID string) (*voice.ListenerSession, error) {
	var session voice.ListenerSession
	if err := s.findOne(ctx, "room_listener_sessions", bson.M{"_id": sessionID}, &session, apperrors.ErrListenerSessionNotFound); err != nil {
		return nil, err
	}
	return &session, nil
}

func (s *Store) ListActiveListenerSessions(ctx context.Context, roomID string) ([]*voice.ListenerSession, error) {
	cursor, err := s.db.Collection("room_listener_sessions").Find(ctx, bson.M{
		"roomId": roomID,
		"status": voice.ListenerSessionActive,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var sessions []*voice.ListenerSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s *Store) ListActiveListenerSessionsByUser(ctx context.Context, roomID, userID string) ([]*voice.ListenerSession, error) {
	cursor, err := s.db.Collection("room_listener_sessions").Find(ctx, bson.M{
		"roomId": roomID,
		"userId": userID,
		"status": voice.ListenerSessionActive,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var sessions []*voice.ListenerSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s *Store) ListStaleListenerSessions(ctx context.Context, cutoff time.Time, limit int) ([]*voice.ListenerSession, error) {
	opts := options.Find().SetSort(bson.D{{Key: "lastHeartbeatAt", Value: 1}})
	if limit > 0 {
		opts.SetLimit(int64(limit))
	}
	cursor, err := s.db.Collection("room_listener_sessions").Find(ctx, bson.M{
		"status":          voice.ListenerSessionActive,
		"lastHeartbeatAt": bson.M{"$lt": cutoff},
	}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var sessions []*voice.ListenerSession
	if err := cursor.All(ctx, &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s *Store) CountActiveListeners(ctx context.Context, roomID string) (int, error) {
	count, err := s.db.Collection("room_listener_sessions").CountDocuments(ctx, bson.M{
		"roomId": roomID,
		"status": voice.ListenerSessionActive,
	})
	return int(count), err
}

func (s *Store) SaveParticipantSession(ctx context.Context, session *voice.ParticipantSession) error {
	return s.replace(ctx, "room_participant_sessions", session.ID, session)
}

func (s *Store) CountActiveParticipantSessions(ctx context.Context, roomID string) (int, error) {
	count, err := s.db.Collection("room_participant_sessions").CountDocuments(ctx, bson.M{
		"roomId": roomID,
		"status": voice.ParticipantSessionActive,
	})
	return int(count), err
}

func (s *Store) SaveSpeakerRequest(ctx context.Context, request *voice.SpeakerRequest) error {
	return s.replace(ctx, "speaker_requests", request.ID, request)
}

func (s *Store) GetSpeakerRequest(ctx context.Context, requestID string) (*voice.SpeakerRequest, error) {
	var request voice.SpeakerRequest
	if err := s.findOne(ctx, "speaker_requests", bson.M{"_id": requestID}, &request, apperrors.ErrSpeakerRequestNotFound); err != nil {
		return nil, err
	}
	return &request, nil
}

func (s *Store) FindPendingSpeakerRequest(ctx context.Context, roomID, userID string) (*voice.SpeakerRequest, error) {
	return s.findSpeakerRequest(ctx, roomID, userID, voice.SpeakerRequestPending)
}

func (s *Store) FindApprovedSpeakerRequest(ctx context.Context, roomID, userID string) (*voice.SpeakerRequest, error) {
	return s.findSpeakerRequest(ctx, roomID, userID, voice.SpeakerRequestApproved)
}

func (s *Store) SaveSpeakingBlock(ctx context.Context, block *voice.SpeakingBlock) error {
	return s.replace(ctx, "speaking_blocks", block.ID, block)
}

func (s *Store) GetActiveSpeakingBlock(ctx context.Context, roomID, userID string) (*voice.SpeakingBlock, error) {
	var block voice.SpeakingBlock
	err := s.findOne(ctx, "speaking_blocks", bson.M{
		"roomId":      roomID,
		"userId":      userID,
		"unblockedAt": bson.M{"$exists": false},
	}, &block, apperrors.ErrSpeakingBlockNotFound)
	if err != nil {
		return nil, err
	}
	return &block, nil
}

func (s *Store) SaveRecording(ctx context.Context, recording *voice.RoomRecording) error {
	return s.replace(ctx, "room_recordings", recording.ID, recording)
}

func (s *Store) GetRecording(ctx context.Context, recordingID string) (*voice.RoomRecording, error) {
	var recording voice.RoomRecording
	if err := s.findOne(ctx, "room_recordings", bson.M{"_id": recordingID}, &recording, apperrors.ErrRecordingNotFound); err != nil {
		return nil, err
	}
	return &recording, nil
}

func (s *Store) ListRecordings(ctx context.Context, roomID string) ([]*voice.RoomRecording, error) {
	cursor, err := s.db.Collection("room_recordings").Find(ctx, bson.M{"roomId": roomID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var recordings []*voice.RoomRecording
	if err := cursor.All(ctx, &recordings); err != nil {
		return nil, err
	}
	return recordings, nil
}

func (s *Store) SaveReport(ctx context.Context, report *voice.RoomReport) error {
	_, err := s.db.Collection("room_reports").ReplaceOne(ctx, bson.M{"roomId": report.RoomID}, report, options.Replace().SetUpsert(true))
	return err
}

func (s *Store) GetReport(ctx context.Context, roomID string) (*voice.RoomReport, error) {
	var report voice.RoomReport
	if err := s.findOne(ctx, "room_reports", bson.M{"roomId": roomID}, &report, apperrors.ErrReportNotFound); err != nil {
		return nil, err
	}
	return &report, nil
}

func (s *Store) ReportStats(ctx context.Context, roomID string) (voiceapp.ReportStats, error) {
	listenerCursor, err := s.db.Collection("room_listener_sessions").Find(ctx, bson.M{"roomId": roomID})
	if err != nil {
		return voiceapp.ReportStats{}, err
	}
	defer listenerCursor.Close(ctx)

	now := time.Now().UTC()
	listeners := map[string]struct{}{}
	totalJoinEvents := 0
	activeListeners := 0
	var totalListening int64
	for listenerCursor.Next(ctx) {
		var session voice.ListenerSession
		if err := listenerCursor.Decode(&session); err != nil {
			return voiceapp.ReportStats{}, err
		}
		totalJoinEvents++
		listeners[session.UserID] = struct{}{}
		end := now
		if session.LeftAt != nil {
			end = *session.LeftAt
		}
		if end.After(session.JoinedAt) {
			totalListening += int64(end.Sub(session.JoinedAt).Seconds())
		}
		if session.Status == voice.ListenerSessionActive {
			activeListeners++
		}
	}
	if err := listenerCursor.Err(); err != nil {
		return voiceapp.ReportStats{}, err
	}

	participantCursor, err := s.db.Collection("room_participant_sessions").Find(ctx, bson.M{"roomId": roomID})
	if err != nil {
		return voiceapp.ReportStats{}, err
	}
	defer participantCursor.Close(ctx)
	speakers := map[string]struct{}{}
	for participantCursor.Next(ctx) {
		var session voice.ParticipantSession
		if err := participantCursor.Decode(&session); err != nil {
			return voiceapp.ReportStats{}, err
		}
		if voice.RoleUsesLiveKit(session.Role) {
			speakers[session.UserID] = struct{}{}
		}
	}
	if err := participantCursor.Err(); err != nil {
		return voiceapp.ReportStats{}, err
	}

	return voiceapp.ReportStats{
		UniqueListeners:         len(listeners),
		UniqueSpeakers:          len(speakers),
		TotalJoinEvents:         totalJoinEvents,
		PeakConcurrentListeners: activeListeners,
		TotalListeningSeconds:   totalListening,
		TotalSpeakingSeconds:    0,
	}, nil
}

func (s *Store) AppendEvent(ctx context.Context, event *voice.EventEnvelope) error {
	_, err := s.db.Collection("room_events").InsertOne(ctx, event)
	return err
}

func (s *Store) findSpeakerRequest(ctx context.Context, roomID, userID string, status voice.SpeakerRequestStatus) (*voice.SpeakerRequest, error) {
	var request voice.SpeakerRequest
	err := s.findOne(ctx, "speaker_requests", bson.M{
		"roomId": roomID,
		"userId": userID,
		"status": status,
	}, &request, apperrors.ErrSpeakerRequestNotFound)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func (s *Store) replace(ctx context.Context, collection, id string, doc any) error {
	_, err := s.db.Collection(collection).ReplaceOne(ctx, bson.M{"_id": id}, doc, options.Replace().SetUpsert(true))
	return err
}

func (s *Store) findOne(ctx context.Context, collection string, filter any, out any, notFound error) error {
	err := s.db.Collection(collection).FindOne(ctx, filter).Decode(out)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return notFound
	}
	return err
}

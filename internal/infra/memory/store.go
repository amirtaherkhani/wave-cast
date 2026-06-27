package memory

import (
	"context"
	"sync"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	apperrors "github.com/amirtaherkhani/wave-cast/internal/platform/errors"
)

type Store struct {
	mu sync.RWMutex

	rooms               map[string]*voice.Room
	listenerSessions    map[string]*voice.ListenerSession
	participantSessions map[string]*voice.ParticipantSession
	speakerRequests     map[string]*voice.SpeakerRequest
	speakingBlocks      map[string]*voice.SpeakingBlock
	recordings          map[string]*voice.RoomRecording
	reportsByRoom       map[string]*voice.RoomReport
	events              []*voice.EventEnvelope
}

func NewStore() *Store {
	return &Store{
		rooms:               map[string]*voice.Room{},
		listenerSessions:    map[string]*voice.ListenerSession{},
		participantSessions: map[string]*voice.ParticipantSession{},
		speakerRequests:     map[string]*voice.SpeakerRequest{},
		speakingBlocks:      map[string]*voice.SpeakingBlock{},
		recordings:          map[string]*voice.RoomRecording{},
		reportsByRoom:       map[string]*voice.RoomReport{},
		events:              []*voice.EventEnvelope{},
	}
}

func (s *Store) SaveRoom(_ context.Context, room *voice.Room) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *room
	s.rooms[room.ID] = &copy
	return nil
}

func (s *Store) GetRoom(_ context.Context, roomID string) (*voice.Room, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	room, ok := s.rooms[roomID]
	if !ok {
		return nil, apperrors.ErrRoomNotFound
	}
	copy := *room
	return &copy, nil
}

func (s *Store) SaveListenerSession(_ context.Context, session *voice.ListenerSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *session
	s.listenerSessions[session.ID] = &copy
	return nil
}

func (s *Store) GetListenerSession(_ context.Context, sessionID string) (*voice.ListenerSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.listenerSessions[sessionID]
	if !ok {
		return nil, apperrors.ErrListenerSessionNotFound
	}
	copy := *session
	return &copy, nil
}

func (s *Store) ListActiveListenerSessions(_ context.Context, roomID string) ([]*voice.ListenerSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*voice.ListenerSession{}
	for _, session := range s.listenerSessions {
		if session.RoomID == roomID && session.Status == voice.ListenerSessionActive {
			copy := *session
			out = append(out, &copy)
		}
	}
	return out, nil
}

func (s *Store) ListActiveListenerSessionsByUser(_ context.Context, roomID, userID string) ([]*voice.ListenerSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*voice.ListenerSession{}
	for _, session := range s.listenerSessions {
		if session.RoomID == roomID && session.UserID == userID && session.Status == voice.ListenerSessionActive {
			copy := *session
			out = append(out, &copy)
		}
	}
	return out, nil
}

func (s *Store) ListStaleListenerSessions(_ context.Context, cutoff time.Time, limit int) ([]*voice.ListenerSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*voice.ListenerSession{}
	for _, session := range s.listenerSessions {
		if session.Status == voice.ListenerSessionActive && session.LastHeartbeatAt.Before(cutoff) {
			copy := *session
			out = append(out, &copy)
			if limit > 0 && len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (s *Store) CountActiveListeners(_ context.Context, roomID string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, session := range s.listenerSessions {
		if session.RoomID == roomID && session.Status == voice.ListenerSessionActive {
			count++
		}
	}
	return count, nil
}

func (s *Store) SaveParticipantSession(_ context.Context, session *voice.ParticipantSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *session
	s.participantSessions[session.ID] = &copy
	return nil
}

func (s *Store) CountActiveParticipantSessions(_ context.Context, roomID string) (int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	count := 0
	for _, session := range s.participantSessions {
		if session.RoomID == roomID && session.Status == voice.ParticipantSessionActive {
			count++
		}
	}
	return count, nil
}

func (s *Store) SaveSpeakerRequest(_ context.Context, request *voice.SpeakerRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *request
	s.speakerRequests[request.ID] = &copy
	return nil
}

func (s *Store) GetSpeakerRequest(_ context.Context, requestID string) (*voice.SpeakerRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	request, ok := s.speakerRequests[requestID]
	if !ok {
		return nil, apperrors.ErrSpeakerRequestNotFound
	}
	copy := *request
	return &copy, nil
}

func (s *Store) FindPendingSpeakerRequest(_ context.Context, roomID, userID string) (*voice.SpeakerRequest, error) {
	return s.findSpeakerRequest(roomID, userID, voice.SpeakerRequestPending)
}

func (s *Store) FindApprovedSpeakerRequest(_ context.Context, roomID, userID string) (*voice.SpeakerRequest, error) {
	return s.findSpeakerRequest(roomID, userID, voice.SpeakerRequestApproved)
}

func (s *Store) findSpeakerRequest(roomID, userID string, status voice.SpeakerRequestStatus) (*voice.SpeakerRequest, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, request := range s.speakerRequests {
		if request.RoomID == roomID && request.UserID == userID && request.Status == status {
			copy := *request
			return &copy, nil
		}
	}
	return nil, apperrors.ErrSpeakerRequestNotFound
}

func (s *Store) SaveSpeakingBlock(_ context.Context, block *voice.SpeakingBlock) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *block
	s.speakingBlocks[block.ID] = &copy
	return nil
}

func (s *Store) GetActiveSpeakingBlock(_ context.Context, roomID, userID string) (*voice.SpeakingBlock, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, block := range s.speakingBlocks {
		if block.RoomID == roomID && block.UserID == userID && block.UnblockedAt == nil {
			copy := *block
			return &copy, nil
		}
	}
	return nil, apperrors.ErrSpeakingBlockNotFound
}

func (s *Store) SaveRecording(_ context.Context, recording *voice.RoomRecording) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *recording
	s.recordings[recording.ID] = &copy
	return nil
}

func (s *Store) GetRecording(_ context.Context, recordingID string) (*voice.RoomRecording, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	recording, ok := s.recordings[recordingID]
	if !ok {
		return nil, apperrors.ErrRecordingNotFound
	}
	copy := *recording
	return &copy, nil
}

func (s *Store) ListRecordings(_ context.Context, roomID string) ([]*voice.RoomRecording, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []*voice.RoomRecording{}
	for _, recording := range s.recordings {
		if recording.RoomID == roomID {
			copy := *recording
			out = append(out, &copy)
		}
	}
	return out, nil
}

func (s *Store) SaveReport(_ context.Context, report *voice.RoomReport) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *report
	s.reportsByRoom[report.RoomID] = &copy
	return nil
}

func (s *Store) GetReport(_ context.Context, roomID string) (*voice.RoomReport, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	report, ok := s.reportsByRoom[roomID]
	if !ok {
		return nil, apperrors.ErrReportNotFound
	}
	copy := *report
	return &copy, nil
}

func (s *Store) ReportStats(_ context.Context, roomID string) (voiceapp.ReportStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now().UTC()
	listeners := map[string]struct{}{}
	speakers := map[string]struct{}{}
	var totalListening int64
	totalJoinEvents := 0
	activeListeners := 0

	for _, session := range s.listenerSessions {
		if session.RoomID != roomID {
			continue
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
	for _, session := range s.participantSessions {
		if session.RoomID != roomID {
			continue
		}
		if voice.RoleUsesLiveKit(session.Role) {
			speakers[session.UserID] = struct{}{}
		}
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

func (s *Store) AppendEvent(_ context.Context, event *voice.EventEnvelope) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *event
	s.events = append(s.events, &copy)
	return nil
}

func (s *Store) Events() []*voice.EventEnvelope {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*voice.EventEnvelope, 0, len(s.events))
	for _, event := range s.events {
		copy := *event
		out = append(out, &copy)
	}
	return out
}

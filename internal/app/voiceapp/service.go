package voiceapp

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	apperrors "github.com/amirtaherkhani/wave-cast/internal/platform/errors"
	"github.com/amirtaherkhani/wave-cast/internal/platform/ids"
)

type Service struct {
	store    Store
	eventBus EventBus
	liveKit  LiveKitTokenIssuer
	realtime RealtimeTokenIssuer
	media    MediaGateway
	logger   *slog.Logger
	cfg      ServiceConfig
}

func NewService(
	store Store,
	eventBus EventBus,
	liveKit LiveKitTokenIssuer,
	realtime RealtimeTokenIssuer,
	media MediaGateway,
	logger *slog.Logger,
	cfg ServiceConfig,
) *Service {
	return &Service{
		store:    store,
		eventBus: eventBus,
		liveKit:  liveKit,
		realtime: realtime,
		media:    media,
		logger:   logger,
		cfg:      cfg,
	}
}

func (s *Service) CreateRoom(ctx context.Context, cmd CreateRoomCommand) (*voice.Room, error) {
	title := strings.TrimSpace(cmd.Title)
	if title == "" || strings.TrimSpace(cmd.OwnerID) == "" {
		return nil, apperrors.ErrInvalidArgument
	}

	now := time.Now().UTC()
	roomID := ids.New(ids.PrefixRoom)
	room := &voice.Room{
		ID:               roomID,
		Title:            title,
		Status:           voice.RoomStatusDraft,
		OwnerID:          cmd.OwnerID,
		AdminIDs:         uniqueStrings(cmd.AdminIDs),
		ModeratorIDs:     uniqueStrings(cmd.ModeratorIDs),
		LiveKitRoomName:  "lk_" + roomID,
		ListenerStreamID: ids.New(ids.PrefixListenerStream),
		Passive:          s.media.PassiveMedia(roomID),
		Recording: voice.RoomRecordingConfig{
			Enabled: s.cfg.RecordingEnabled,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.store.SaveRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventRoomCreated, room.ID, cmd.OwnerID, "", cmd.CorrelationID, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *Service) StartRoom(ctx context.Context, cmd StartRoomCommand) (*voice.Room, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	if room.Status != voice.RoomStatusDraft && room.Status != voice.RoomStatusScheduled {
		return nil, apperrors.ErrInvalidRoomState
	}

	now := time.Now().UTC()
	room.Status = voice.RoomStatusLive
	room.StartedAt = &now
	room.UpdatedAt = now

	if err := s.store.SaveRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventRoomStarted, room.ID, cmd.ActorUserID, "", cmd.CorrelationID, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *Service) FinishRoom(ctx context.Context, cmd FinishRoomCommand) (*voice.Room, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	if room.Status != voice.RoomStatusLive && room.Status != voice.RoomStatusScheduled {
		return nil, apperrors.ErrInvalidRoomState
	}

	now := time.Now().UTC()
	room.Status = voice.RoomStatusFinished
	room.EndedAt = &now
	room.EndedBy = cmd.ActorUserID
	room.EndReason = strings.TrimSpace(cmd.Reason)
	room.UpdatedAt = now

	if err := s.store.SaveRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventRoomFinished, room.ID, cmd.ActorUserID, "", cmd.CorrelationID, room); err != nil {
		return nil, err
	}
	return room, nil
}

func (s *Service) GetRoom(ctx context.Context, roomID string) (*voice.Room, error) {
	return s.store.GetRoom(ctx, roomID)
}

func (s *Service) ActiveCounts(ctx context.Context, roomID string) (ActiveCounts, error) {
	listeners, err := s.store.CountActiveListeners(ctx, roomID)
	if err != nil {
		return ActiveCounts{}, err
	}
	liveKit, err := s.store.CountActiveParticipantSessions(ctx, roomID)
	if err != nil {
		return ActiveCounts{}, err
	}
	return ActiveCounts{
		RoomID:      roomID,
		Listeners:   listeners,
		LiveKit:     liveKit,
		ActiveUsers: listeners + liveKit,
	}, nil
}

func (s *Service) JoinRoom(ctx context.Context, cmd JoinRoomCommand) (*voice.JoinRoomResult, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if room.Status != voice.RoomStatusLive {
		return nil, apperrors.ErrRoomNotLive
	}

	role, err := s.resolveRole(ctx, room, cmd.UserID)
	if err != nil {
		return nil, err
	}

	result := &voice.JoinRoomResult{
		RoomID:      room.ID,
		Role:        role,
		Permissions: permissionsFor(role),
		Events:      s.realtimeDescriptor(room.ID, cmd.UserID, role),
	}

	if voice.RoleUsesLiveKit(role) {
		session := &voice.ParticipantSession{
			ID:              ids.New(ids.PrefixParticipant),
			RoomID:          room.ID,
			UserID:          cmd.UserID,
			Role:            role,
			LiveKitIdentity: cmd.UserID,
			Status:          voice.ParticipantSessionActive,
			JoinedAt:        time.Now().UTC(),
		}
		if err := s.store.SaveParticipantSession(ctx, session); err != nil {
			return nil, err
		}
		speaker, err := s.liveKit.IssueSpeakerToken(ctx, SpeakerTokenInput{
			RoomName: room.LiveKitRoomName,
			Identity: cmd.UserID,
			Role:     role,
		})
		if err != nil {
			return nil, err
		}
		result.MediaPath = voice.MediaPathLiveKit
		result.Speaker = speaker
		return result, nil
	}

	now := time.Now().UTC()
	session := &voice.ListenerSession{
		ID:              ids.New(ids.PrefixListenerSession),
		RoomID:          room.ID,
		UserID:          cmd.UserID,
		Status:          voice.ListenerSessionActive,
		PlaybackURLKind: room.Passive.Mode,
		JoinedAt:        now,
		LastHeartbeatAt: now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := s.store.SaveListenerSession(ctx, session); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventListenerSessionStarted, room.ID, cmd.UserID, "", cmd.CorrelationID, session); err != nil {
		return nil, err
	}

	result.MediaPath = voice.MediaPathLLHLS
	result.Listener = s.media.ListenerDescriptor(room, session.ID, s.cfg.HeartbeatInterval)
	return result, nil
}

func (s *Service) ListenerHeartbeat(ctx context.Context, cmd ListenerHeartbeatCommand) (*voice.ListenerSession, error) {
	session, err := s.store.GetListenerSession(ctx, cmd.SessionID)
	if err != nil {
		return nil, err
	}
	if session.RoomID != cmd.RoomID || session.UserID != cmd.UserID {
		return nil, apperrors.ErrPermissionDenied
	}
	if session.Status != voice.ListenerSessionActive {
		return nil, apperrors.ErrListenerSessionNotFound
	}

	now := time.Now().UTC()
	session.LastHeartbeatAt = now
	session.UpdatedAt = now
	if err := s.store.SaveListenerSession(ctx, session); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventListenerHeartbeatReceived, session.RoomID, cmd.UserID, "", cmd.CorrelationID, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *Service) LeaveListener(ctx context.Context, cmd LeaveListenerCommand) (*voice.ListenerSession, error) {
	session, err := s.store.GetListenerSession(ctx, cmd.SessionID)
	if err != nil {
		return nil, err
	}
	if session.RoomID != cmd.RoomID || session.UserID != cmd.UserID {
		return nil, apperrors.ErrPermissionDenied
	}

	now := time.Now().UTC()
	session.Status = voice.ListenerSessionLeft
	session.LeftAt = &now
	session.LeaveType = strings.TrimSpace(cmd.LeaveType)
	session.UpdatedAt = now
	if err := s.store.SaveListenerSession(ctx, session); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventListenerSessionLeft, session.RoomID, cmd.UserID, "", cmd.CorrelationID, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *Service) ListenerStream(ctx context.Context, roomID string) (*voice.ListenerMediaDescriptor, error) {
	room, err := s.store.GetRoom(ctx, roomID)
	if err != nil {
		return nil, err
	}
	return s.media.ListenerDescriptor(room, "", s.cfg.HeartbeatInterval), nil
}

func (s *Service) RequestToSpeak(ctx context.Context, cmd RequestToSpeakCommand) (*voice.SpeakerRequest, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if room.Status != voice.RoomStatusLive {
		return nil, apperrors.ErrRoomNotLive
	}
	if _, err := s.store.FindPendingSpeakerRequest(ctx, room.ID, cmd.UserID); err == nil {
		return nil, apperrors.ErrConflict
	} else if !errors.Is(err, apperrors.ErrSpeakerRequestNotFound) {
		return nil, err
	}

	req := &voice.SpeakerRequest{
		ID:          ids.New(ids.PrefixSpeakerRequest),
		RoomID:      room.ID,
		UserID:      cmd.UserID,
		Status:      voice.SpeakerRequestPending,
		RequestedAt: time.Now().UTC(),
	}
	if err := s.store.SaveSpeakerRequest(ctx, req); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventSpeakerRequested, room.ID, cmd.UserID, cmd.UserID, cmd.CorrelationID, req); err != nil {
		return nil, err
	}
	return req, nil
}

func (s *Service) ApproveSpeakerRequest(ctx context.Context, cmd DecideSpeakerRequestCommand) (*voice.SpeakerRequest, error) {
	return s.decideSpeakerRequest(ctx, cmd, voice.SpeakerRequestApproved, voice.EventSpeakerApproved)
}

func (s *Service) DeclineSpeakerRequest(ctx context.Context, cmd DecideSpeakerRequestCommand) (*voice.SpeakerRequest, error) {
	return s.decideSpeakerRequest(ctx, cmd, voice.SpeakerRequestDeclined, voice.EventSpeakerDeclined)
}

func (s *Service) CreateSpeakerSession(ctx context.Context, cmd CreateSpeakerSessionCommand) (*voice.JoinRoomResult, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if room.Status != voice.RoomStatusLive {
		return nil, apperrors.ErrRoomNotLive
	}

	role, err := s.resolveRole(ctx, room, cmd.UserID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleUsesLiveKit(role) {
		return nil, apperrors.ErrPermissionDenied
	}
	session := &voice.ParticipantSession{
		ID:              ids.New(ids.PrefixParticipant),
		RoomID:          room.ID,
		UserID:          cmd.UserID,
		Role:            role,
		LiveKitIdentity: cmd.UserID,
		Status:          voice.ParticipantSessionActive,
		JoinedAt:        time.Now().UTC(),
	}
	if err := s.store.SaveParticipantSession(ctx, session); err != nil {
		return nil, err
	}
	speaker, err := s.liveKit.IssueSpeakerToken(ctx, SpeakerTokenInput{
		RoomName: room.LiveKitRoomName,
		Identity: cmd.UserID,
		Role:     role,
	})
	if err != nil {
		return nil, err
	}
	return &voice.JoinRoomResult{
		RoomID:      room.ID,
		Role:        role,
		MediaPath:   voice.MediaPathLiveKit,
		Permissions: permissionsFor(role),
		Speaker:     speaker,
		Events:      s.realtimeDescriptor(room.ID, cmd.UserID, role),
	}, nil
}

func (s *Service) RevokeSpeaker(ctx context.Context, cmd RevokeSpeakerCommand) error {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return apperrors.ErrPermissionDenied
	}
	return s.publish(ctx, voice.EventSpeakerRevoked, room.ID, cmd.ActorUserID, cmd.TargetUserID, cmd.CorrelationID, map[string]any{
		"roomId":       room.ID,
		"targetUserId": cmd.TargetUserID,
		"reason":       cmd.Reason,
	})
}

func (s *Service) RemoveParticipant(ctx context.Context, cmd RemoveParticipantCommand) error {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return apperrors.ErrPermissionDenied
	}
	return s.publish(ctx, voice.EventModerationUserRemoved, room.ID, cmd.ActorUserID, cmd.TargetUserID, cmd.CorrelationID, map[string]any{
		"roomId":       room.ID,
		"targetUserId": cmd.TargetUserID,
		"reason":       cmd.Reason,
	})
}

func (s *Service) StartRecording(ctx context.Context, cmd StartRecordingCommand) (*voice.RoomRecording, error) {
	if !s.cfg.RecordingEnabled {
		return nil, apperrors.ErrRecordingDisabled
	}
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	if room.Status != voice.RoomStatusLive {
		return nil, apperrors.ErrRoomNotLive
	}

	now := time.Now().UTC()
	recording := &voice.RoomRecording{
		ID:        ids.New(ids.PrefixRecording),
		RoomID:    room.ID,
		Status:    voice.RecordingStatusStarted,
		StartedAt: now,
		CreatedAt: now,
		UpdatedAt: now,
		Storage: voice.StorageObject{
			Provider: "s3",
			Bucket:   s.cfg.S3Bucket,
			Region:   s.cfg.S3Region,
			Key:      fmt.Sprintf("%s/%s/full.mp4", strings.Trim(s.cfg.S3RecordingsPrefix, "/"), room.ID),
			MimeType: "video/mp4",
		},
	}
	room.Recording.ActiveRecordingID = recording.ID
	room.UpdatedAt = now
	if err := s.store.SaveRecording(ctx, recording); err != nil {
		return nil, err
	}
	if err := s.store.SaveRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventRecordingStarted, room.ID, cmd.ActorUserID, "", cmd.CorrelationID, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *Service) StopRecording(ctx context.Context, cmd StopRecordingCommand) (*voice.RoomRecording, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	recording, err := s.store.GetRecording(ctx, cmd.RecordingID)
	if err != nil {
		return nil, err
	}
	if recording.RoomID != room.ID {
		return nil, apperrors.ErrRecordingNotFound
	}

	now := time.Now().UTC()
	recording.Status = voice.RecordingStatusCompleted
	recording.EndedAt = &now
	recording.DurationSeconds = int64(now.Sub(recording.StartedAt).Seconds())
	if s.cfg.RecordingRetentionDays > 0 {
		expires := now.Add(time.Duration(s.cfg.RecordingRetentionDays) * 24 * time.Hour)
		recording.ExpiresAt = &expires
	}
	recording.UpdatedAt = now
	room.Recording.ActiveRecordingID = ""
	room.UpdatedAt = now

	if err := s.store.SaveRecording(ctx, recording); err != nil {
		return nil, err
	}
	if err := s.store.SaveRoom(ctx, room); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventRecordingCompleted, room.ID, cmd.ActorUserID, "", cmd.CorrelationID, recording); err != nil {
		return nil, err
	}
	return recording, nil
}

func (s *Service) ListRecordings(ctx context.Context, roomID string) ([]*voice.RoomRecording, error) {
	return s.store.ListRecordings(ctx, roomID)
}

func (s *Service) GetRecording(ctx context.Context, recordingID string) (*voice.RoomRecording, error) {
	return s.store.GetRecording(ctx, recordingID)
}

func (s *Service) GenerateReport(ctx context.Context, cmd GenerateReportCommand) (*voice.RoomReport, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	stats, err := s.store.ReportStats(ctx, room.ID)
	if err != nil {
		return nil, err
	}
	report := &voice.RoomReport{
		ID:     ids.New(ids.PrefixReport),
		RoomID: room.ID,
		Status: voice.ReportStatusCompleted,
		Summary: voice.ReportSummary{
			UniqueListeners:         stats.UniqueListeners,
			UniqueSpeakers:          stats.UniqueSpeakers,
			TotalJoinEvents:         stats.TotalJoinEvents,
			PeakConcurrentListeners: stats.PeakConcurrentListeners,
			TotalListeningSeconds:   stats.TotalListeningSeconds,
			TotalSpeakingSeconds:    stats.TotalSpeakingSeconds,
		},
		GeneratedAt: time.Now().UTC(),
	}
	if err := s.store.SaveReport(ctx, report); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, voice.EventReportCompleted, room.ID, cmd.ActorUserID, "", cmd.CorrelationID, report); err != nil {
		return nil, err
	}
	return report, nil
}

func (s *Service) GetReport(ctx context.Context, roomID string) (*voice.RoomReport, error) {
	return s.store.GetReport(ctx, roomID)
}

func (s *Service) RealtimeConnectionToken(userID string) (map[string]any, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, apperrors.ErrInvalidArgument
	}
	token, err := s.realtime.ConnectionToken(userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"url":   s.cfg.RealtimeURL,
		"token": token,
	}, nil
}

func (s *Service) RealtimeSubscriptionToken(ctx context.Context, userID, channel string) (map[string]any, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(channel) == "" {
		return nil, apperrors.ErrInvalidArgument
	}
	if err := s.authorizeChannel(ctx, userID, channel); err != nil {
		return nil, err
	}
	token, err := s.realtime.SubscriptionToken(userID, channel)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"channel": channel,
		"token":   token,
	}, nil
}

func (s *Service) decideSpeakerRequest(ctx context.Context, cmd DecideSpeakerRequestCommand, status voice.SpeakerRequestStatus, eventType string) (*voice.SpeakerRequest, error) {
	room, err := s.store.GetRoom(ctx, cmd.RoomID)
	if err != nil {
		return nil, err
	}
	if !voice.RoleCanModerate(room.ResolveRole(cmd.ActorUserID)) {
		return nil, apperrors.ErrPermissionDenied
	}
	request, err := s.store.GetSpeakerRequest(ctx, cmd.RequestID)
	if err != nil {
		return nil, err
	}
	if request.RoomID != room.ID || request.Status != voice.SpeakerRequestPending {
		return nil, apperrors.ErrInvalidRoomState
	}

	now := time.Now().UTC()
	request.Status = status
	request.DecidedAt = &now
	request.DecidedBy = cmd.ActorUserID
	request.DecisionReason = strings.TrimSpace(cmd.Reason)
	if err := s.store.SaveSpeakerRequest(ctx, request); err != nil {
		return nil, err
	}
	if err := s.publish(ctx, eventType, room.ID, cmd.ActorUserID, request.UserID, cmd.CorrelationID, request); err != nil {
		return nil, err
	}
	return request, nil
}

func (s *Service) resolveRole(ctx context.Context, room *voice.Room, userID string) (voice.RoomRole, error) {
	role := room.ResolveRole(userID)
	if role != voice.RoleListener {
		return role, nil
	}
	if _, err := s.store.FindApprovedSpeakerRequest(ctx, room.ID, userID); err == nil {
		return voice.RoleSpeaker, nil
	} else if !errors.Is(err, apperrors.ErrSpeakerRequestNotFound) {
		return "", err
	}
	return voice.RoleListener, nil
}

func permissionsFor(role voice.RoomRole) voice.RoomPermissions {
	return voice.RoomPermissions{
		CanSpeak:    voice.RoleUsesLiveKit(role),
		CanModerate: voice.RoleCanModerate(role),
		CanRecord:   voice.RoleCanModerate(role),
		CanReport:   voice.RoleCanModerate(role),
	}
}

func (s *Service) realtimeDescriptor(roomID, userID string, role voice.RoomRole) voice.RealtimeDescriptor {
	channels := []string{"room:" + roomID, "user:" + userID}
	if voice.RoleCanModerate(role) {
		channels = append(channels, "room:"+roomID+":admins")
	}
	return voice.RealtimeDescriptor{
		URL:                s.cfg.RealtimeURL,
		ConnectionTokenURL: "/v1/realtime/token",
		Channels:           channels,
	}
}

func (s *Service) authorizeChannel(ctx context.Context, userID, channel string) error {
	if strings.HasPrefix(channel, "user:") {
		if channel != "user:"+userID {
			return apperrors.ErrPermissionDenied
		}
		return nil
	}
	if strings.HasPrefix(channel, "room:") {
		parts := strings.Split(channel, ":")
		if len(parts) < 2 {
			return apperrors.ErrInvalidArgument
		}
		room, err := s.store.GetRoom(ctx, parts[1])
		if err != nil {
			return err
		}
		role, err := s.resolveRole(ctx, room, userID)
		if err != nil {
			return err
		}
		if len(parts) == 3 && parts[2] == "admins" && !voice.RoleCanModerate(role) {
			return apperrors.ErrPermissionDenied
		}
		return nil
	}
	if strings.HasPrefix(channel, "listener_session:") {
		return nil
	}
	return apperrors.ErrPermissionDenied
}

func (s *Service) publish(ctx context.Context, eventType, roomID, actorUserID, targetUserID, correlationID string, payload any) error {
	event := &voice.EventEnvelope{
		EventID:       ids.New(ids.PrefixEvent),
		EventType:     eventType,
		EventVersion:  1,
		RoomID:        roomID,
		ActorUserID:   actorUserID,
		TargetUserID:  targetUserID,
		CorrelationID: correlationID,
		OccurredAt:    time.Now().UTC(),
		Payload:       payload,
	}
	if err := s.store.AppendEvent(ctx, event); err != nil {
		return err
	}
	if err := s.eventBus.Publish(ctx, event); err != nil {
		s.logger.ErrorContext(ctx, "event publish failed", "event_type", eventType, "event_id", event.EventID, "error", err)
		return err
	}
	return nil
}

func uniqueStrings(values []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

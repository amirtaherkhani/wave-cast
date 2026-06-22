package voiceapp

import (
	"context"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type Store interface {
	SaveRoom(ctx context.Context, room *voice.Room) error
	GetRoom(ctx context.Context, roomID string) (*voice.Room, error)

	SaveListenerSession(ctx context.Context, session *voice.ListenerSession) error
	GetListenerSession(ctx context.Context, sessionID string) (*voice.ListenerSession, error)
	CountActiveListeners(ctx context.Context, roomID string) (int, error)

	SaveParticipantSession(ctx context.Context, session *voice.ParticipantSession) error
	CountActiveParticipantSessions(ctx context.Context, roomID string) (int, error)

	SaveSpeakerRequest(ctx context.Context, request *voice.SpeakerRequest) error
	GetSpeakerRequest(ctx context.Context, requestID string) (*voice.SpeakerRequest, error)
	FindPendingSpeakerRequest(ctx context.Context, roomID, userID string) (*voice.SpeakerRequest, error)
	FindApprovedSpeakerRequest(ctx context.Context, roomID, userID string) (*voice.SpeakerRequest, error)

	SaveRecording(ctx context.Context, recording *voice.RoomRecording) error
	GetRecording(ctx context.Context, recordingID string) (*voice.RoomRecording, error)
	ListRecordings(ctx context.Context, roomID string) ([]*voice.RoomRecording, error)

	SaveReport(ctx context.Context, report *voice.RoomReport) error
	GetReport(ctx context.Context, roomID string) (*voice.RoomReport, error)
	ReportStats(ctx context.Context, roomID string) (ReportStats, error)

	AppendEvent(ctx context.Context, event *voice.EventEnvelope) error
}

type EventBus interface {
	Publish(ctx context.Context, event *voice.EventEnvelope) error
}

type LiveKitTokenIssuer interface {
	IssueSpeakerToken(ctx context.Context, input SpeakerTokenInput) (*voice.SpeakerMediaDescriptor, error)
}

type RealtimeTokenIssuer interface {
	ConnectionToken(userID string) (string, error)
	SubscriptionToken(userID, channel string) (string, error)
}

type MediaGateway interface {
	PassiveMedia(roomID string) voice.PassiveMedia
	ListenerDescriptor(room *voice.Room, sessionID string, heartbeatInterval time.Duration) *voice.ListenerMediaDescriptor
}

type ServiceConfig struct {
	RealtimeURL            string
	HeartbeatInterval      time.Duration
	RecordingEnabled       bool
	RecordingRetentionDays int
	S3Bucket               string
	S3Region               string
	S3RecordingsPrefix     string
}

type ReportStats struct {
	UniqueListeners         int
	UniqueSpeakers          int
	TotalJoinEvents         int
	PeakConcurrentListeners int
	TotalListeningSeconds   int64
	TotalSpeakingSeconds    int64
}

type CreateRoomCommand struct {
	Title         string
	OwnerID       string
	AdminIDs      []string
	ModeratorIDs  []string
	CorrelationID string
}

type StartRoomCommand struct {
	RoomID        string
	ActorUserID   string
	CorrelationID string
}

type FinishRoomCommand struct {
	RoomID        string
	ActorUserID   string
	Reason        string
	CorrelationID string
}

type JoinRoomCommand struct {
	RoomID        string
	UserID        string
	CorrelationID string
}

type ListenerHeartbeatCommand struct {
	RoomID        string
	SessionID     string
	UserID        string
	CorrelationID string
}

type LeaveListenerCommand struct {
	RoomID        string
	SessionID     string
	UserID        string
	LeaveType     string
	CorrelationID string
}

type RequestToSpeakCommand struct {
	RoomID        string
	UserID        string
	CorrelationID string
}

type DecideSpeakerRequestCommand struct {
	RoomID        string
	RequestID     string
	ActorUserID   string
	Reason        string
	CorrelationID string
}

type CreateSpeakerSessionCommand struct {
	RoomID        string
	UserID        string
	CorrelationID string
}

type RevokeSpeakerCommand struct {
	RoomID        string
	ActorUserID   string
	TargetUserID  string
	Reason        string
	CorrelationID string
}

type RemoveParticipantCommand struct {
	RoomID        string
	ActorUserID   string
	TargetUserID  string
	Reason        string
	CorrelationID string
}

type StartRecordingCommand struct {
	RoomID        string
	ActorUserID   string
	CorrelationID string
}

type StopRecordingCommand struct {
	RoomID        string
	RecordingID   string
	ActorUserID   string
	CorrelationID string
}

type GenerateReportCommand struct {
	RoomID        string
	ActorUserID   string
	CorrelationID string
}

type SpeakerTokenInput struct {
	RoomName string
	Identity string
	Role     voice.RoomRole
}

type ActiveCounts struct {
	RoomID      string `json:"roomId"`
	Listeners   int    `json:"listeners"`
	LiveKit     int    `json:"liveKitParticipants"`
	ActiveUsers int    `json:"activeUsers"`
}

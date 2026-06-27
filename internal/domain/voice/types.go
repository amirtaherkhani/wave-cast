package voice

import "time"

type RoomID string
type UserID string
type ListenerSessionID string
type ParticipantSessionID string
type SpeakerRequestID string
type RecordingID string
type ReportID string
type EventID string

type RoomStatus string

const (
	RoomStatusDraft     RoomStatus = "draft"
	RoomStatusScheduled RoomStatus = "scheduled"
	RoomStatusLive      RoomStatus = "live"
	RoomStatusEnding    RoomStatus = "ending"
	RoomStatusFinished  RoomStatus = "finished"
	RoomStatusCancelled RoomStatus = "cancelled"
)

type RoomRole string

const (
	RoleOwner     RoomRole = "owner"
	RoleAdmin     RoomRole = "admin"
	RoleModerator RoomRole = "moderator"
	RoleSpeaker   RoomRole = "speaker"
	RoleListener  RoomRole = "listener"
)

type MediaPath string

const (
	MediaPathLiveKit MediaPath = "livekit"
	MediaPathHLS     MediaPath = "hls"
	MediaPathLLHLS   MediaPath = "ll_hls"
)

type SpeakingStatus string

const (
	SpeakingNone      SpeakingStatus = "none"
	SpeakingRequested SpeakingStatus = "requested"
	SpeakingApproved  SpeakingStatus = "approved"
	SpeakingDeclined  SpeakingStatus = "declined"
	SpeakingBlocked   SpeakingStatus = "blocked"
	SpeakingRevoked   SpeakingStatus = "revoked"
)

type ListenerSessionStatus string

const (
	ListenerSessionActive  ListenerSessionStatus = "active"
	ListenerSessionLeft    ListenerSessionStatus = "left"
	ListenerSessionExpired ListenerSessionStatus = "expired"
	ListenerSessionRemoved ListenerSessionStatus = "removed"
)

type ParticipantSessionStatus string

const (
	ParticipantSessionActive  ParticipantSessionStatus = "active"
	ParticipantSessionLeft    ParticipantSessionStatus = "left"
	ParticipantSessionRemoved ParticipantSessionStatus = "removed"
)

type StreamStatus string

const (
	StreamStatusPreparing StreamStatus = "preparing"
	StreamStatusLive      StreamStatus = "live"
	StreamStatusStalled   StreamStatus = "stalled"
	StreamStatusEnded     StreamStatus = "ended"
	StreamStatusFailed    StreamStatus = "failed"
)

type StreamProtocol string

const (
	StreamProtocolHLS   StreamProtocol = "hls"
	StreamProtocolLLHLS StreamProtocol = "ll_hls"
)

type SpeakerRequestStatus string

const (
	SpeakerRequestPending   SpeakerRequestStatus = "pending"
	SpeakerRequestApproved  SpeakerRequestStatus = "approved"
	SpeakerRequestDeclined  SpeakerRequestStatus = "declined"
	SpeakerRequestCancelled SpeakerRequestStatus = "cancelled"
	SpeakerRequestRevoked   SpeakerRequestStatus = "revoked"
)

type RecordingStatus string

const (
	RecordingStatusRequested RecordingStatus = "requested"
	RecordingStatusStarted   RecordingStatus = "started"
	RecordingStatusStopping  RecordingStatus = "stopping"
	RecordingStatusCompleted RecordingStatus = "completed"
	RecordingStatusFailed    RecordingStatus = "failed"
	RecordingStatusExpired   RecordingStatus = "expired"
	RecordingStatusDeleted   RecordingStatus = "deleted"
)

type ReportStatus string

const (
	ReportStatusRequested  ReportStatus = "requested"
	ReportStatusGenerating ReportStatus = "generating"
	ReportStatusCompleted  ReportStatus = "completed"
	ReportStatusFailed     ReportStatus = "failed"
)

type PassiveMedia struct {
	Enabled           bool           `json:"enabled" bson:"enabled"`
	Mode              string         `json:"mode" bson:"mode"`
	Protocol          StreamProtocol `json:"protocol" bson:"protocol"`
	OriginPlaybackURL string         `json:"originPlaybackUrl" bson:"originPlaybackUrl"`
	CDNPlaybackURL    string         `json:"cdnPlaybackUrl,omitempty" bson:"cdnPlaybackUrl,omitempty"`
	TargetLatencyMS   int            `json:"targetLatencyMs" bson:"targetLatencyMs"`
	SegmentDurationMS int            `json:"segmentDurationMs" bson:"segmentDurationMs"`
	PartDurationMS    int            `json:"partDurationMs" bson:"partDurationMs"`
}

type RoomRecordingConfig struct {
	Enabled           bool   `json:"enabled" bson:"enabled"`
	ActiveRecordingID string `json:"activeRecordingId,omitempty" bson:"activeRecordingId,omitempty"`
}

type Room struct {
	ID               string              `json:"id" bson:"_id"`
	Title            string              `json:"title" bson:"title"`
	Status           RoomStatus          `json:"status" bson:"status"`
	OwnerID          string              `json:"ownerId" bson:"ownerId"`
	AdminIDs         []string            `json:"adminIds" bson:"adminIds"`
	ModeratorIDs     []string            `json:"moderatorIds" bson:"moderatorIds"`
	LiveKitRoomName  string              `json:"livekitRoomName" bson:"livekitRoomName"`
	ListenerStreamID string              `json:"listenerStreamId" bson:"listenerStreamId"`
	Passive          PassiveMedia        `json:"passive" bson:"passive"`
	Recording        RoomRecordingConfig `json:"recording" bson:"recording"`
	StartedAt        *time.Time          `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	EndedAt          *time.Time          `json:"endedAt,omitempty" bson:"endedAt,omitempty"`
	EndedBy          string              `json:"endedBy,omitempty" bson:"endedBy,omitempty"`
	EndReason        string              `json:"endReason,omitempty" bson:"endReason,omitempty"`
	CreatedAt        time.Time           `json:"createdAt" bson:"createdAt"`
	UpdatedAt        time.Time           `json:"updatedAt" bson:"updatedAt"`
}

func (r Room) ResolveRole(userID string) RoomRole {
	if userID == "" {
		return RoleListener
	}
	if r.OwnerID == userID {
		return RoleOwner
	}
	for _, id := range r.AdminIDs {
		if id == userID {
			return RoleAdmin
		}
	}
	for _, id := range r.ModeratorIDs {
		if id == userID {
			return RoleModerator
		}
	}
	return RoleListener
}

func RoleCanModerate(role RoomRole) bool {
	return role == RoleOwner || role == RoleAdmin || role == RoleModerator
}

func RoleUsesLiveKit(role RoomRole) bool {
	return role == RoleOwner || role == RoleAdmin || role == RoleModerator || role == RoleSpeaker
}

type RoomPermissions struct {
	CanSpeak    bool `json:"canSpeak"`
	CanModerate bool `json:"canModerate"`
	CanRecord   bool `json:"canRecord"`
	CanReport   bool `json:"canReport"`
}

type RealtimeDescriptor struct {
	URL                string   `json:"url"`
	ConnectionTokenURL string   `json:"connectionTokenUrl"`
	Channels           []string `json:"channels"`
}

type ListenerMediaDescriptor struct {
	Protocol                 StreamProtocol `json:"protocol"`
	PlaybackURL              string         `json:"playbackUrl"`
	SessionID                string         `json:"sessionId"`
	HeartbeatIntervalSeconds int            `json:"heartbeatIntervalSeconds"`
	RefreshURL               string         `json:"refreshUrl"`
	HeartbeatURL             string         `json:"heartbeatUrl"`
	TargetLatencyMS          int            `json:"targetLatencyMs"`
}

type SpeakerMediaDescriptor struct {
	Provider string `json:"provider"`
	URL      string `json:"url"`
	Token    string `json:"token"`
	RoomName string `json:"roomName"`
	Identity string `json:"identity"`
}

type JoinRoomResult struct {
	RoomID      string                   `json:"roomId"`
	Role        RoomRole                 `json:"role"`
	MediaPath   MediaPath                `json:"mediaPath"`
	Permissions RoomPermissions          `json:"permissions"`
	Listener    *ListenerMediaDescriptor `json:"listener,omitempty"`
	Speaker     *SpeakerMediaDescriptor  `json:"speaker,omitempty"`
	Events      RealtimeDescriptor       `json:"events"`
}

type ListenerSession struct {
	ID              string                `json:"id" bson:"_id"`
	RoomID          string                `json:"roomId" bson:"roomId"`
	UserID          string                `json:"userId" bson:"userId"`
	Status          ListenerSessionStatus `json:"status" bson:"status"`
	PlaybackURLKind string                `json:"playbackUrlKind" bson:"playbackUrlKind"`
	JoinedAt        time.Time             `json:"joinedAt" bson:"joinedAt"`
	LeftAt          *time.Time            `json:"leftAt,omitempty" bson:"leftAt,omitempty"`
	LastHeartbeatAt time.Time             `json:"lastHeartbeatAt" bson:"lastHeartbeatAt"`
	LeaveType       string                `json:"leaveType,omitempty" bson:"leaveType,omitempty"`
	RemovedBy       string                `json:"removedBy,omitempty" bson:"removedBy,omitempty"`
	RemoveReason    string                `json:"removeReason,omitempty" bson:"removeReason,omitempty"`
	CreatedAt       time.Time             `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time             `json:"updatedAt" bson:"updatedAt"`
}

type ParticipantSession struct {
	ID              string                   `json:"id" bson:"_id"`
	RoomID          string                   `json:"roomId" bson:"roomId"`
	UserID          string                   `json:"userId" bson:"userId"`
	Role            RoomRole                 `json:"role" bson:"role"`
	LiveKitIdentity string                   `json:"livekitIdentity" bson:"livekitIdentity"`
	Status          ParticipantSessionStatus `json:"status" bson:"status"`
	JoinedAt        time.Time                `json:"joinedAt" bson:"joinedAt"`
	LeftAt          *time.Time               `json:"leftAt,omitempty" bson:"leftAt,omitempty"`
	LeaveType       string                   `json:"leaveType,omitempty" bson:"leaveType,omitempty"`
}

type SpeakerRequest struct {
	ID             string               `json:"id" bson:"_id"`
	RoomID         string               `json:"roomId" bson:"roomId"`
	UserID         string               `json:"userId" bson:"userId"`
	Status         SpeakerRequestStatus `json:"status" bson:"status"`
	RequestedAt    time.Time            `json:"requestedAt" bson:"requestedAt"`
	DecidedAt      *time.Time           `json:"decidedAt,omitempty" bson:"decidedAt,omitempty"`
	DecidedBy      string               `json:"decidedBy,omitempty" bson:"decidedBy,omitempty"`
	DecisionReason string               `json:"decisionReason,omitempty" bson:"decisionReason,omitempty"`
}

type SpeakingBlock struct {
	ID          string     `json:"id" bson:"_id"`
	RoomID      string     `json:"roomId" bson:"roomId"`
	UserID      string     `json:"userId" bson:"userId"`
	BlockedBy   string     `json:"blockedBy" bson:"blockedBy"`
	Reason      string     `json:"reason,omitempty" bson:"reason,omitempty"`
	BlockedAt   time.Time  `json:"blockedAt" bson:"blockedAt"`
	UnblockedBy string     `json:"unblockedBy,omitempty" bson:"unblockedBy,omitempty"`
	UnblockedAt *time.Time `json:"unblockedAt,omitempty" bson:"unblockedAt,omitempty"`
}

type StorageObject struct {
	Provider  string `json:"provider" bson:"provider"`
	Bucket    string `json:"bucket" bson:"bucket"`
	Region    string `json:"region" bson:"region"`
	Key       string `json:"key" bson:"key"`
	MimeType  string `json:"mimeType" bson:"mimeType"`
	SizeBytes int64  `json:"sizeBytes" bson:"sizeBytes"`
}

type RoomRecording struct {
	ID              string          `json:"id" bson:"_id"`
	RoomID          string          `json:"roomId" bson:"roomId"`
	EgressID        string          `json:"egressId,omitempty" bson:"egressId,omitempty"`
	Status          RecordingStatus `json:"status" bson:"status"`
	Storage         StorageObject   `json:"storage" bson:"storage"`
	DurationSeconds int64           `json:"durationSeconds" bson:"durationSeconds"`
	StartedAt       time.Time       `json:"startedAt" bson:"startedAt"`
	EndedAt         *time.Time      `json:"endedAt,omitempty" bson:"endedAt,omitempty"`
	ExpiresAt       *time.Time      `json:"expiresAt,omitempty" bson:"expiresAt,omitempty"`
	CreatedAt       time.Time       `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt" bson:"updatedAt"`
}

type ReportSummary struct {
	UniqueListeners         int   `json:"uniqueListeners" bson:"uniqueListeners"`
	UniqueSpeakers          int   `json:"uniqueSpeakers" bson:"uniqueSpeakers"`
	TotalJoinEvents         int   `json:"totalJoinEvents" bson:"totalJoinEvents"`
	PeakConcurrentListeners int   `json:"peakConcurrentListeners" bson:"peakConcurrentListeners"`
	TotalListeningSeconds   int64 `json:"totalListeningSeconds" bson:"totalListeningSeconds"`
	TotalSpeakingSeconds    int64 `json:"totalSpeakingSeconds" bson:"totalSpeakingSeconds"`
}

type RoomReport struct {
	ID          string        `json:"id" bson:"_id"`
	RoomID      string        `json:"roomId" bson:"roomId"`
	Status      ReportStatus  `json:"status" bson:"status"`
	Summary     ReportSummary `json:"summary" bson:"summary"`
	GeneratedAt time.Time     `json:"generatedAt" bson:"generatedAt"`
}

type EventEnvelope struct {
	EventID       string    `json:"eventId" bson:"eventId"`
	EventType     string    `json:"eventType" bson:"eventType"`
	EventVersion  int       `json:"eventVersion" bson:"eventVersion"`
	RoomID        string    `json:"roomId,omitempty" bson:"roomId,omitempty"`
	ActorUserID   string    `json:"actorUserId,omitempty" bson:"actorUserId,omitempty"`
	TargetUserID  string    `json:"targetUserId,omitempty" bson:"targetUserId,omitempty"`
	CorrelationID string    `json:"correlationId,omitempty" bson:"correlationId,omitempty"`
	CausationID   string    `json:"causationId,omitempty" bson:"causationId,omitempty"`
	OccurredAt    time.Time `json:"occurredAt" bson:"occurredAt"`
	Payload       any       `json:"payload" bson:"payload"`
}

const (
	EventRoomCreated               = "voice.room.created"
	EventRoomStarted               = "voice.room.started"
	EventRoomFinished              = "voice.room.finished"
	EventListenerSessionStarted    = "voice.listener.session.started"
	EventListenerHeartbeatReceived = "voice.listener.session.heartbeat_received"
	EventListenerSessionLeft       = "voice.listener.session.left"
	EventListenerSessionExpired    = "voice.listener.session.expired"
	EventSpeakerRequested          = "voice.speaker.requested"
	EventSpeakerApproved           = "voice.speaker.approved"
	EventSpeakerDeclined           = "voice.speaker.declined"
	EventSpeakerRevoked            = "voice.speaker.revoked"
	EventSpeakerBlocked            = "voice.speaker.blocked"
	EventSpeakerUnblocked          = "voice.speaker.unblocked"
	EventModerationUserRemoved     = "voice.moderation.user_removed"
	EventRecordingStarted          = "voice.recording.started"
	EventRecordingCompleted        = "voice.recording.completed"
	EventReportCompleted           = "voice.report.completed"
)

type AsyncJobType string

const (
	JobDispatchRealtimeEvent    AsyncJobType = "dispatch_realtime_event"
	JobRetryRealtimeEvent       AsyncJobType = "retry_failed_realtime_event"
	JobGenerateRoomReport       AsyncJobType = "generate_room_report"
	JobRegenerateRoomReport     AsyncJobType = "regenerate_room_report"
	JobExportRoomReport         AsyncJobType = "export_room_report"
	JobFinalizeRecording        AsyncJobType = "finalize_recording"
	JobExpireRecording          AsyncJobType = "expire_recording"
	JobDeleteRecordingFile      AsyncJobType = "delete_recording_file"
	JobGenerateRecordingURL     AsyncJobType = "generate_recording_playback_url"
	JobExpireListenerSession    AsyncJobType = "expire_stale_listener_sessions"
	JobCloseRoomSessions        AsyncJobType = "close_room_sessions"
	JobSyncRoomActiveCounts     AsyncJobType = "sync_room_active_counts"
	JobProcessLiveKitWebhook    AsyncJobType = "process_livekit_webhook"
	JobProcessEgressWebhook     AsyncJobType = "process_egress_webhook"
	JobSendNotification         AsyncJobType = "send_notification"
	JobSyncAnalytics            AsyncJobType = "sync_analytics"
	JobAggregateListenerMetrics AsyncJobType = "aggregate_listener_metrics"
	JobAggregateSpeakerMetrics  AsyncJobType = "aggregate_speaker_metrics"
)

package asyncjobs

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	coreasync "github.com/amirtaherkhani/wave-cast/internal/core/async"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type Registry struct {
	service *voiceapp.Service
	logger  *slog.Logger
	timeout time.Duration
}

func NewRegistry(service *voiceapp.Service, logger *slog.Logger, listenerTimeout time.Duration) *Registry {
	return &Registry{
		service: service,
		logger:  logger,
		timeout: listenerTimeout,
	}
}

func (r *Registry) Register(runner *coreasync.Runner) {
	runner.Handle(string(voice.JobCloseRoomSessions), r.closeRoomSessions)
	runner.Handle(string(voice.JobGenerateRoomReport), r.generateRoomReport)
	runner.Handle(string(voice.JobExpireListenerSession), r.expireStaleListenerSessions)

	runner.Handle(string(voice.JobFinalizeRecording), r.notImplementedYet)
	runner.Handle(string(voice.JobExpireRecording), r.notImplementedYet)
	runner.Handle(string(voice.JobDeleteRecordingFile), r.notImplementedYet)
	runner.Handle(string(voice.JobDispatchRealtimeEvent), r.notImplementedYet)
	runner.Handle(string(voice.JobRetryRealtimeEvent), r.notImplementedYet)
	runner.Handle(string(voice.JobProcessLiveKitWebhook), r.notImplementedYet)
	runner.Handle(string(voice.JobProcessEgressWebhook), r.notImplementedYet)
	runner.Handle(string(voice.JobSendNotification), r.notImplementedYet)
	runner.Handle(string(voice.JobSyncAnalytics), r.notImplementedYet)
}

type roomJobPayload struct {
	RoomID      string `json:"roomId"`
	ActorUserID string `json:"actorUserId"`
}

func (r *Registry) closeRoomSessions(ctx context.Context, job *coreasync.Job) error {
	payload, err := coreasync.DecodePayload[roomJobPayload](job)
	if err != nil {
		return err
	}
	return r.service.CloseRoomSessions(ctx, payload.RoomID, time.Now().UTC(), job.IdempotencyKey)
}

func (r *Registry) generateRoomReport(ctx context.Context, job *coreasync.Job) error {
	payload, err := coreasync.DecodePayload[roomJobPayload](job)
	if err != nil {
		return err
	}
	actorID := payload.ActorUserID
	if actorID == "" {
		room, err := r.service.GetRoom(ctx, payload.RoomID)
		if err != nil {
			return err
		}
		actorID = room.OwnerID
	}
	_, err = r.service.GenerateReport(ctx, voiceapp.GenerateReportCommand{
		RoomID:        payload.RoomID,
		ActorUserID:   actorID,
		CorrelationID: job.IdempotencyKey,
	})
	return err
}

func (r *Registry) expireStaleListenerSessions(ctx context.Context, job *coreasync.Job) error {
	cutoff := time.Now().UTC().Add(-r.timeout)
	result, err := r.service.ExpireStaleListenerSessions(ctx, cutoff, 250, job.IdempotencyKey)
	if err != nil {
		return err
	}
	r.logger.InfoContext(ctx, "stale listener expiration completed", "component", "async_worker", "operation", job.Type, "expired", result.Expired)
	return nil
}

func (r *Registry) notImplementedYet(ctx context.Context, job *coreasync.Job) error {
	var payload map[string]any
	_ = json.Unmarshal(job.Payload, &payload)
	r.logger.WarnContext(ctx, "background job registered as no-op pending adapter implementation", "component", "async_worker", "operation", job.Type, "job_id", job.ID, "payload", payload)
	return nil
}

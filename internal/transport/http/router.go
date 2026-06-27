package httptransport

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	apperrors "github.com/amirtaherkhani/wave-cast/internal/platform/errors"
	"github.com/amirtaherkhani/wave-cast/internal/platform/ids"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

type API struct {
	service *voiceapp.Service
	logger  *slog.Logger
}

func NewRouter(service *voiceapp.Service, logger *slog.Logger, allowedOrigins []string) http.Handler {
	api := &API{service: service, logger: logger}
	r := chi.NewRouter()
	r.Use(requestContext)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-User-ID", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", api.health)
	r.Get("/readyz", api.ready)

	r.Route("/v1", func(r chi.Router) {
		r.Post("/rooms", api.createRoom)
		r.Get("/rooms/{roomId}", api.getRoom)
		r.Post("/rooms/{roomId}/start", api.startRoom)
		r.Post("/rooms/{roomId}/finish", api.finishRoom)
		r.Get("/rooms/{roomId}/active-counts", api.activeCounts)
		r.Post("/rooms/{roomId}/join", api.joinRoom)
		r.Post("/rooms/{roomId}/leave", api.leaveRoom)

		r.Post("/rooms/{roomId}/listener-sessions", api.joinRoom)
		r.Post("/rooms/{roomId}/listener-sessions/{sessionId}/heartbeat", api.listenerHeartbeat)
		r.Post("/rooms/{roomId}/listener-sessions/{sessionId}/leave", api.leaveListener)
		r.Post("/rooms/{roomId}/listener-sessions/{sessionId}/refresh-playback-url", api.refreshPlaybackURL)
		r.Get("/rooms/{roomId}/listener-stream", api.listenerStream)

		r.Post("/rooms/{roomId}/speaker-requests", api.requestToSpeak)
		r.Post("/rooms/{roomId}/speaker-requests/{requestId}/approve", api.approveSpeakerRequest)
		r.Post("/rooms/{roomId}/speaker-requests/{requestId}/decline", api.declineSpeakerRequest)
		r.Post("/rooms/{roomId}/speaker-session", api.createSpeakerSession)
		r.Post("/rooms/{roomId}/participants/{userId}/revoke-speaker", api.revokeSpeaker)
		r.Post("/rooms/{roomId}/participants/{userId}/block-speaking", api.blockSpeaking)
		r.Post("/rooms/{roomId}/participants/{userId}/unblock-speaking", api.unblockSpeaking)

		r.Post("/rooms/{roomId}/participants/{userId}/remove", api.removeParticipant)

		r.Post("/rooms/{roomId}/recording/start", api.startRecording)
		r.Post("/rooms/{roomId}/recording/stop", api.stopRecording)
		r.Get("/rooms/{roomId}/recordings", api.listRecordings)
		r.Get("/rooms/{roomId}/recordings/{recordingId}/playback-url", api.recordingPlaybackURL)
		r.Delete("/rooms/{roomId}/recordings/{recordingId}", api.notImplementedEvent)

		r.Post("/rooms/{roomId}/report/generate", api.generateReport)
		r.Get("/rooms/{roomId}/report", api.getReport)
		r.Get("/rooms/{roomId}/report/status", api.getReport)

		r.Get("/realtime/token", api.realtimeToken)
		r.Post("/realtime/subscription-token", api.subscriptionToken)

		r.Post("/webhooks/livekit", api.acceptedWebhook)
		r.Post("/webhooks/egress", api.acceptedWebhook)
	})
	return r
}

func requestContext(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		correlationID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		if correlationID == "" {
			correlationID = ids.New("corr")
		}
		ctx := context.WithValue(r.Context(), "correlation_id", correlationID)
		ctx = context.WithValue(ctx, "trace_id", correlationID)
		w.Header().Set("X-Request-ID", correlationID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *API) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) ready(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
}

type createRoomRequest struct {
	Title        string   `json:"title"`
	OwnerID      string   `json:"ownerId"`
	AdminIDs     []string `json:"adminIds"`
	ModeratorIDs []string `json:"moderatorIds"`
}

func (a *API) createRoom(w http.ResponseWriter, r *http.Request) {
	var req createRoomRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.OwnerID == "" {
		req.OwnerID = userID(r, "")
	}
	room, err := a.service.CreateRoom(r.Context(), voiceapp.CreateRoomCommand{
		Title:         req.Title,
		OwnerID:       req.OwnerID,
		AdminIDs:      req.AdminIDs,
		ModeratorIDs:  req.ModeratorIDs,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, room)
}

func (a *API) getRoom(w http.ResponseWriter, r *http.Request) {
	room, err := a.service.GetRoom(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

type actorRequest struct {
	ActorUserID string `json:"actorUserId"`
	Reason      string `json:"reason"`
}

func (a *API) startRoom(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	room, err := a.service.StartRoom(r.Context(), voiceapp.StartRoomCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func (a *API) finishRoom(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	room, err := a.service.FinishRoom(r.Context(), voiceapp.FinishRoomCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func (a *API) activeCounts(w http.ResponseWriter, r *http.Request) {
	counts, err := a.service.ActiveCounts(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, counts)
}

type userRequest struct {
	UserID    string `json:"userId"`
	SessionID string `json:"sessionId"`
	LeaveType string `json:"leaveType"`
}

func (a *API) joinRoom(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	result, err := a.service.JoinRoom(r.Context(), voiceapp.JoinRoomCommand{
		RoomID:        roomID(r),
		UserID:        userID(r, req.UserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) leaveRoom(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	session, err := a.service.LeaveListener(r.Context(), voiceapp.LeaveListenerCommand{
		RoomID:        roomID(r),
		SessionID:     req.SessionID,
		UserID:        userID(r, req.UserID),
		LeaveType:     req.LeaveType,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, session)
}

func (a *API) listenerHeartbeat(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	session, err := a.service.ListenerHeartbeat(r.Context(), voiceapp.ListenerHeartbeatCommand{
		RoomID:        roomID(r),
		SessionID:     sessionID(r),
		UserID:        userID(r, req.UserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, session)
}

func (a *API) leaveListener(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	session, err := a.service.LeaveListener(r.Context(), voiceapp.LeaveListenerCommand{
		RoomID:        roomID(r),
		SessionID:     sessionID(r),
		UserID:        userID(r, req.UserID),
		LeaveType:     req.LeaveType,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, session)
}

func (a *API) refreshPlaybackURL(w http.ResponseWriter, r *http.Request) {
	stream, err := a.service.ListenerStream(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	stream.SessionID = sessionID(r)
	writeJSON(w, http.StatusOK, stream)
}

func (a *API) listenerStream(w http.ResponseWriter, r *http.Request) {
	stream, err := a.service.ListenerStream(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, stream)
}

func (a *API) requestToSpeak(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	request, err := a.service.RequestToSpeak(r.Context(), voiceapp.RequestToSpeakCommand{
		RoomID:        roomID(r),
		UserID:        userID(r, req.UserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, request)
}

func (a *API) approveSpeakerRequest(w http.ResponseWriter, r *http.Request) {
	a.decideSpeakerRequest(w, r, true)
}

func (a *API) declineSpeakerRequest(w http.ResponseWriter, r *http.Request) {
	a.decideSpeakerRequest(w, r, false)
}

func (a *API) decideSpeakerRequest(w http.ResponseWriter, r *http.Request, approve bool) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	cmd := voiceapp.DecideSpeakerRequestCommand{
		RoomID:        roomID(r),
		RequestID:     chi.URLParam(r, "requestId"),
		ActorUserID:   userID(r, req.ActorUserID),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	}
	var (
		result any
		err    error
	)
	if approve {
		result, err = a.service.ApproveSpeakerRequest(r.Context(), cmd)
	} else {
		result, err = a.service.DeclineSpeakerRequest(r.Context(), cmd)
	}
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) createSpeakerSession(w http.ResponseWriter, r *http.Request) {
	var req userRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	result, err := a.service.CreateSpeakerSession(r.Context(), voiceapp.CreateSpeakerSessionCommand{
		RoomID:        roomID(r),
		UserID:        userID(r, req.UserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) revokeSpeaker(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	err := a.service.RevokeSpeaker(r.Context(), voiceapp.RevokeSpeakerCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		TargetUserID:  chi.URLParam(r, "userId"),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (a *API) blockSpeaking(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	block, err := a.service.BlockSpeaking(r.Context(), voiceapp.SpeakingBlockCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		TargetUserID:  chi.URLParam(r, "userId"),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, block)
}

func (a *API) unblockSpeaking(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	block, err := a.service.UnblockSpeaking(r.Context(), voiceapp.SpeakingBlockCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		TargetUserID:  chi.URLParam(r, "userId"),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, block)
}

func (a *API) removeParticipant(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	err := a.service.RemoveParticipant(r.Context(), voiceapp.RemoveParticipantCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		TargetUserID:  chi.URLParam(r, "userId"),
		Reason:        req.Reason,
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (a *API) startRecording(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	recording, err := a.service.StartRecording(r.Context(), voiceapp.StartRecordingCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, recording)
}

type stopRecordingRequest struct {
	ActorUserID string `json:"actorUserId"`
	RecordingID string `json:"recordingId"`
}

func (a *API) stopRecording(w http.ResponseWriter, r *http.Request) {
	var req stopRecordingRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	recording, err := a.service.StopRecording(r.Context(), voiceapp.StopRecordingCommand{
		RoomID:        roomID(r),
		RecordingID:   req.RecordingID,
		ActorUserID:   userID(r, req.ActorUserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, recording)
}

func (a *API) listRecordings(w http.ResponseWriter, r *http.Request) {
	recordings, err := a.service.ListRecordings(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"recordings": recordings})
}

func (a *API) recordingPlaybackURL(w http.ResponseWriter, r *http.Request) {
	result, err := a.service.RecordingPlaybackURL(r.Context(), roomID(r), chi.URLParam(r, "recordingId"), userID(r, r.URL.Query().Get("actorUserId")))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (a *API) generateReport(w http.ResponseWriter, r *http.Request) {
	var req actorRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	report, err := a.service.GenerateReport(r.Context(), voiceapp.GenerateReportCommand{
		RoomID:        roomID(r),
		ActorUserID:   userID(r, req.ActorUserID),
		CorrelationID: correlationID(r),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, report)
}

func (a *API) getReport(w http.ResponseWriter, r *http.Request) {
	report, err := a.service.GetReport(r.Context(), roomID(r))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, report)
}

func (a *API) realtimeToken(w http.ResponseWriter, r *http.Request) {
	uid := userID(r, r.URL.Query().Get("userId"))
	token, err := a.service.RealtimeConnectionToken(uid)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, token)
}

type subscriptionTokenRequest struct {
	UserID  string `json:"userId"`
	Channel string `json:"channel"`
}

func (a *API) subscriptionToken(w http.ResponseWriter, r *http.Request) {
	var req subscriptionTokenRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	token, err := a.service.RealtimeSubscriptionToken(r.Context(), userID(r, req.UserID), req.Channel)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, token)
}

func (a *API) acceptedWebhook(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (a *API) notImplementedEvent(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	if r.Body == nil || r.ContentLength == 0 {
		return true
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		writeError(w, errors.Join(apperrors.ErrInvalidArgument, err))
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, err error) {
	status := apperrors.HTTPStatus(err)
	writeJSON(w, status, map[string]any{
		"error": map[string]any{
			"message": err.Error(),
			"status":  status,
		},
	})
}

func roomID(r *http.Request) string {
	return chi.URLParam(r, "roomId")
}

func sessionID(r *http.Request) string {
	return chi.URLParam(r, "sessionId")
}

func userID(r *http.Request, fallback string) string {
	if header := strings.TrimSpace(r.Header.Get("X-User-ID")); header != "" {
		return header
	}
	return strings.TrimSpace(fallback)
}

func correlationID(r *http.Request) string {
	id, _ := r.Context().Value("correlation_id").(string)
	return id
}

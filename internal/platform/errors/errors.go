package errors

import (
	"errors"
	"net/http"
)

var (
	ErrInvalidArgument         = errors.New("invalid argument")
	ErrRoomNotFound            = errors.New("room not found")
	ErrRoomNotLive             = errors.New("room is not live")
	ErrInvalidRoomState        = errors.New("invalid room state")
	ErrPermissionDenied        = errors.New("permission denied")
	ErrSpeakerBlocked          = errors.New("speaker is blocked")
	ErrSpeakerRequestNotFound  = errors.New("speaker request not found")
	ErrListenerSessionNotFound = errors.New("listener session not found")
	ErrRecordingNotFound       = errors.New("recording not found")
	ErrRecordingDisabled       = errors.New("recording is disabled")
	ErrReportNotFound          = errors.New("report not found")
	ErrConflict                = errors.New("conflict")
)

func HTTPStatus(err error) int {
	switch {
	case err == nil:
		return http.StatusOK
	case errors.Is(err, ErrInvalidArgument):
		return http.StatusBadRequest
	case errors.Is(err, ErrRoomNotFound),
		errors.Is(err, ErrSpeakerRequestNotFound),
		errors.Is(err, ErrListenerSessionNotFound),
		errors.Is(err, ErrRecordingNotFound),
		errors.Is(err, ErrReportNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrPermissionDenied):
		return http.StatusForbidden
	case errors.Is(err, ErrRoomNotLive),
		errors.Is(err, ErrInvalidRoomState),
		errors.Is(err, ErrSpeakerBlocked),
		errors.Is(err, ErrRecordingDisabled),
		errors.Is(err, ErrConflict):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

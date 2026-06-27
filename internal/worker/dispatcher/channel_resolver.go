package dispatcher

import (
	"strings"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type ClientEvent struct {
	EventID      string `json:"eventId"`
	Name         string `json:"name"`
	RoomID       string `json:"roomId,omitempty"`
	ActorUserID  string `json:"actorUserId,omitempty"`
	TargetUserID string `json:"targetUserId,omitempty"`
	OccurredAt   string `json:"occurredAt"`
	Payload      any    `json:"payload,omitempty"`
}

type ResolvedEvent struct {
	Channel string
	Event   ClientEvent
}

func Resolve(event *voice.EventEnvelope) []ResolvedEvent {
	name := ClientEventName(event.EventType)
	if name == "" {
		return nil
	}
	clientEvent := ClientEvent{
		EventID:      event.EventID,
		Name:         name,
		RoomID:       event.RoomID,
		ActorUserID:  event.ActorUserID,
		TargetUserID: event.TargetUserID,
		OccurredAt:   event.OccurredAt.Format("2006-01-02T15:04:05.999999999Z07:00"),
		Payload:      event.Payload,
	}

	switch event.EventType {
	case voice.EventSpeakerRequested:
		return []ResolvedEvent{{Channel: "room:" + event.RoomID + ":admins", Event: clientEvent}}
	case voice.EventSpeakerApproved, voice.EventSpeakerDeclined, voice.EventSpeakerRevoked, voice.EventSpeakerBlocked, voice.EventSpeakerUnblocked, voice.EventModerationUserRemoved:
		if event.TargetUserID == "" {
			return nil
		}
		return []ResolvedEvent{{Channel: "user:" + event.TargetUserID, Event: clientEvent}}
	case voice.EventRecordingCompleted, voice.EventReportCompleted:
		return []ResolvedEvent{{Channel: "room:" + event.RoomID + ":admins", Event: clientEvent}}
	default:
		if event.RoomID == "" {
			return nil
		}
		return []ResolvedEvent{{Channel: "room:" + event.RoomID, Event: clientEvent}}
	}
}

func ClientEventName(eventType string) string {
	name := strings.TrimPrefix(eventType, "voice.")
	switch eventType {
	case voice.EventReportCompleted:
		return "report.ready"
	case voice.EventModerationUserRemoved:
		return "participant.removed"
	default:
		return name
	}
}

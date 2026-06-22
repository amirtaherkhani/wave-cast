package voiceapp_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/app/voiceapp"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	"github.com/amirtaherkhani/wave-cast/internal/infra/memory"
)

func TestListenerJoinUsesLLHLSAndHeartbeat(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService()

	room, err := svc.CreateRoom(ctx, voiceapp.CreateRoomCommand{
		Title:   "Engineering Live",
		OwnerID: "usr_owner",
	})
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	if _, err := svc.StartRoom(ctx, voiceapp.StartRoomCommand{RoomID: room.ID, ActorUserID: "usr_owner"}); err != nil {
		t.Fatalf("start room: %v", err)
	}

	join, err := svc.JoinRoom(ctx, voiceapp.JoinRoomCommand{RoomID: room.ID, UserID: "usr_listener"})
	if err != nil {
		t.Fatalf("join listener: %v", err)
	}
	if join.MediaPath != voice.MediaPathLLHLS {
		t.Fatalf("media path = %s, want %s", join.MediaPath, voice.MediaPathLLHLS)
	}
	if join.Listener == nil || join.Listener.PlaybackURL == "" {
		t.Fatalf("listener descriptor missing playback URL: %#v", join.Listener)
	}
	if join.Speaker != nil {
		t.Fatalf("listener received speaker descriptor: %#v", join.Speaker)
	}

	counts, err := svc.ActiveCounts(ctx, room.ID)
	if err != nil {
		t.Fatalf("active counts: %v", err)
	}
	if counts.Listeners != 1 || counts.ActiveUsers != 1 {
		t.Fatalf("counts = %#v, want one listener", counts)
	}

	if _, err := svc.ListenerHeartbeat(ctx, voiceapp.ListenerHeartbeatCommand{
		RoomID:    room.ID,
		SessionID: join.Listener.SessionID,
		UserID:    "usr_listener",
	}); err != nil {
		t.Fatalf("heartbeat: %v", err)
	}
}

func TestSpeakerPromotionIssuesLiveKitTokenOnlyAfterApproval(t *testing.T) {
	ctx := context.Background()
	svc, _ := newTestService()

	room, err := svc.CreateRoom(ctx, voiceapp.CreateRoomCommand{
		Title:   "Engineering Live",
		OwnerID: "usr_owner",
	})
	if err != nil {
		t.Fatalf("create room: %v", err)
	}
	if _, err := svc.StartRoom(ctx, voiceapp.StartRoomCommand{RoomID: room.ID, ActorUserID: "usr_owner"}); err != nil {
		t.Fatalf("start room: %v", err)
	}

	if _, err := svc.CreateSpeakerSession(ctx, voiceapp.CreateSpeakerSessionCommand{RoomID: room.ID, UserID: "usr_listener"}); err == nil {
		t.Fatal("speaker session succeeded before approval")
	}

	request, err := svc.RequestToSpeak(ctx, voiceapp.RequestToSpeakCommand{RoomID: room.ID, UserID: "usr_listener"})
	if err != nil {
		t.Fatalf("request to speak: %v", err)
	}
	if _, err := svc.ApproveSpeakerRequest(ctx, voiceapp.DecideSpeakerRequestCommand{
		RoomID:      room.ID,
		RequestID:   request.ID,
		ActorUserID: "usr_owner",
	}); err != nil {
		t.Fatalf("approve speaker: %v", err)
	}

	join, err := svc.CreateSpeakerSession(ctx, voiceapp.CreateSpeakerSessionCommand{RoomID: room.ID, UserID: "usr_listener"})
	if err != nil {
		t.Fatalf("create speaker session: %v", err)
	}
	if join.MediaPath != voice.MediaPathLiveKit {
		t.Fatalf("media path = %s, want %s", join.MediaPath, voice.MediaPathLiveKit)
	}
	if join.Speaker == nil || join.Speaker.Token != "test-token" {
		t.Fatalf("speaker descriptor = %#v", join.Speaker)
	}
}

func newTestService() (*voiceapp.Service, *memory.Store) {
	store := memory.NewStore()
	svc := voiceapp.NewService(
		store,
		noopBus{},
		fakeLiveKit{},
		fakeRealtime{},
		fakeMedia{},
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		voiceapp.ServiceConfig{
			RealtimeURL:            "http://realtime.test",
			HeartbeatInterval:      30 * time.Second,
			RecordingEnabled:       true,
			RecordingRetentionDays: 30,
			S3Bucket:               "test-bucket",
			S3Region:               "us-east-1",
			S3RecordingsPrefix:     "recordings",
		},
	)
	return svc, store
}

type noopBus struct{}

func (noopBus) Publish(context.Context, *voice.EventEnvelope) error {
	return nil
}

type fakeLiveKit struct{}

func (fakeLiveKit) IssueSpeakerToken(_ context.Context, input voiceapp.SpeakerTokenInput) (*voice.SpeakerMediaDescriptor, error) {
	return &voice.SpeakerMediaDescriptor{
		Provider: "livekit",
		URL:      "ws://livekit.test",
		Token:    "test-token",
		RoomName: input.RoomName,
		Identity: input.Identity,
	}, nil
}

type fakeRealtime struct{}

func (fakeRealtime) ConnectionToken(string) (string, error) {
	return "connection-token", nil
}

func (fakeRealtime) SubscriptionToken(string, string) (string, error) {
	return "subscription-token", nil
}

type fakeMedia struct{}

func (fakeMedia) PassiveMedia(roomID string) voice.PassiveMedia {
	return voice.PassiveMedia{
		Enabled:           true,
		Mode:              "origin",
		Protocol:          voice.StreamProtocolLLHLS,
		OriginPlaybackURL: "http://origin.test/live/" + roomID + "/index.m3u8",
		TargetLatencyMS:   3000,
		SegmentDurationMS: 1000,
		PartDurationMS:    250,
	}
}

func (fakeMedia) ListenerDescriptor(room *voice.Room, sessionID string, heartbeatInterval time.Duration) *voice.ListenerMediaDescriptor {
	return &voice.ListenerMediaDescriptor{
		Protocol:                 room.Passive.Protocol,
		PlaybackURL:              room.Passive.OriginPlaybackURL,
		SessionID:                sessionID,
		HeartbeatIntervalSeconds: int(heartbeatInterval.Seconds()),
		HeartbeatURL:             "/heartbeat",
		RefreshURL:               "/refresh",
		TargetLatencyMS:          room.Passive.TargetLatencyMS,
	}
}

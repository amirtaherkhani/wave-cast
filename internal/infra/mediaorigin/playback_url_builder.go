package mediaorigin

import (
	"fmt"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/config"
	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type Builder struct {
	cfg config.MediaConfig
}

func NewBuilder(cfg config.MediaConfig) *Builder {
	return &Builder{cfg: cfg}
}

func (b *Builder) PassiveMedia(roomID string) voice.PassiveMedia {
	origin := b.playbackURL(b.cfg.OriginBaseURL, roomID)
	cdn := ""
	if b.cfg.CDNBaseURL != "" {
		cdn = b.playbackURL(b.cfg.CDNBaseURL, roomID)
	}
	return voice.PassiveMedia{
		Enabled:           b.cfg.PassiveEnabled,
		Mode:              b.cfg.PassiveMode,
		Protocol:          voice.StreamProtocol(b.cfg.Protocol),
		OriginPlaybackURL: origin,
		CDNPlaybackURL:    cdn,
		TargetLatencyMS:   b.cfg.TargetLatencyMS,
		SegmentDurationMS: b.cfg.SegmentMS,
		PartDurationMS:    b.cfg.PartMS,
	}
}

func (b *Builder) ListenerDescriptor(room *voice.Room, sessionID string, heartbeatInterval time.Duration) *voice.ListenerMediaDescriptor {
	playback := room.Passive.OriginPlaybackURL
	if room.Passive.Mode == "cdn" && room.Passive.CDNPlaybackURL != "" {
		playback = room.Passive.CDNPlaybackURL
	}
	return &voice.ListenerMediaDescriptor{
		Protocol:                 room.Passive.Protocol,
		PlaybackURL:              playback,
		SessionID:                sessionID,
		HeartbeatIntervalSeconds: int(heartbeatInterval.Seconds()),
		RefreshURL:               fmt.Sprintf("/v1/rooms/%s/listener-sessions/%s/refresh-playback-url", room.ID, sessionID),
		HeartbeatURL:             fmt.Sprintf("/v1/rooms/%s/listener-sessions/%s/heartbeat", room.ID, sessionID),
		TargetLatencyMS:          room.Passive.TargetLatencyMS,
	}
}

func (b *Builder) playbackURL(baseURL, roomID string) string {
	if baseURL == "" {
		return ""
	}
	return fmt.Sprintf("%s/live/%s/index.m3u8", baseURL, roomID)
}

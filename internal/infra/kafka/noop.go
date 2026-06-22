package kafka

import (
	"context"
	"log/slog"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
)

type NoopEventBus struct {
	logger *slog.Logger
}

func NewNoopEventBus(logger *slog.Logger) *NoopEventBus {
	return &NoopEventBus{logger: logger}
}

func (b *NoopEventBus) Publish(ctx context.Context, event *voice.EventEnvelope) error {
	b.logger.DebugContext(ctx, "kafka disabled; event kept in store", "event_type", event.EventType, "event_id", event.EventID)
	return nil
}

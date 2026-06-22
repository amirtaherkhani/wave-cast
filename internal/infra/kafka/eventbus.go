package kafka

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	"github.com/twmb/franz-go/pkg/kgo"
)

type EventBus struct {
	client *kgo.Client
	topic  string
	logger *slog.Logger
}

func NewEventBus(brokers []string, clientID, topic string, logger *slog.Logger) (*EventBus, error) {
	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ClientID(clientID),
		kgo.AllowAutoTopicCreation(),
	)
	if err != nil {
		return nil, err
	}
	return &EventBus{client: client, topic: topic, logger: logger}, nil
}

func (b *EventBus) Publish(ctx context.Context, event *voice.EventEnvelope) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	key := event.RoomID
	if key == "" {
		key = event.EventID
	}
	record := &kgo.Record{
		Topic: b.topic,
		Key:   []byte(key),
		Value: payload,
	}
	if err := b.client.ProduceSync(ctx, record).FirstErr(); err != nil {
		return err
	}
	b.logger.InfoContext(ctx, "kafka event published", "event_type", event.EventType, "event_id", event.EventID, "topic", b.topic)
	return nil
}

func (b *EventBus) Close() {
	if b != nil && b.client != nil {
		b.client.Close()
	}
}

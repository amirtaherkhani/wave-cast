package dispatcher

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/amirtaherkhani/wave-cast/internal/domain/voice"
	"github.com/twmb/franz-go/pkg/kgo"
)

type Publisher interface {
	Publish(ctx context.Context, channel string, data any) error
}

type RealtimeDispatcher struct {
	client    *kgo.Client
	publisher Publisher
	logger    *slog.Logger
}

func NewKafkaDispatcher(brokers []string, clientID, groupID, topic string, publisher Publisher, logger *slog.Logger) (*RealtimeDispatcher, error) {
	client, err := kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ClientID(clientID),
		kgo.ConsumerGroup(groupID),
		kgo.ConsumeTopics(topic),
	)
	if err != nil {
		return nil, err
	}
	return &RealtimeDispatcher{client: client, publisher: publisher, logger: logger}, nil
}

func (d *RealtimeDispatcher) Close() {
	if d != nil && d.client != nil {
		d.client.Close()
	}
}

func (d *RealtimeDispatcher) Run(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return nil
		default:
		}
		fetches := d.client.PollFetches(ctx)
		if fetches.IsClientClosed() {
			return nil
		}
		fetches.EachError(func(topic string, partition int32, err error) {
			d.logger.ErrorContext(ctx, "kafka consume error", "component", "realtime_dispatcher", "topic", topic, "partition", partition, "error", err)
		})
		fetches.EachRecord(func(record *kgo.Record) {
			d.handleRecord(ctx, record)
		})
	}
}

func (d *RealtimeDispatcher) handleRecord(ctx context.Context, record *kgo.Record) {
	var event voice.EventEnvelope
	if err := json.Unmarshal(record.Value, &event); err != nil {
		d.logger.ErrorContext(ctx, "event decode failed", "component", "realtime_dispatcher", "error", err)
		_ = d.client.CommitRecords(ctx, record)
		return
	}
	resolved := Resolve(&event)
	for _, item := range resolved {
		if err := d.publisher.Publish(ctx, item.Channel, item.Event); err != nil {
			d.logger.ErrorContext(ctx, "centrifugo publish failed", "component", "realtime_dispatcher", "event_id", event.EventID, "channel", item.Channel, "error", err)
			return
		}
		d.logger.InfoContext(ctx, "client event dispatched", "component", "realtime_dispatcher", "event_id", event.EventID, "event_type", event.EventType, "client_event", item.Event.Name, "channel", item.Channel)
	}
	if len(resolved) == 0 {
		d.logger.DebugContext(ctx, "event skipped for client dispatch", "component", "realtime_dispatcher", "event_id", event.EventID, "event_type", event.EventType)
	}
	commitCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := d.client.CommitRecords(commitCtx, record); err != nil {
		d.logger.ErrorContext(ctx, "kafka commit failed", "component", "realtime_dispatcher", "event_id", event.EventID, "error", err)
	}
}

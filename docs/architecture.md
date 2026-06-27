# Architecture

WaveCast separates media and event responsibilities:

```text
speaker/admin/moderator -> LiveKit SDK -> LiveKit SFU
listener                -> HLS/LL-HLS URL -> native player
backend event           -> Kafka -> realtime dispatcher -> Centrifugo
durable state           -> MongoDB
ephemeral state         -> Redis
recording storage       -> S3-compatible storage
```

The current backend has these layers:

- `cmd/api`: REST API process.
- `cmd/worker`: background worker process for async report/session jobs.
- `cmd/realtime-dispatcher`: Kafka-to-Centrifugo dispatcher consumer group.
- `internal/domain/voice`: domain types and event names.
- `internal/app/voiceapp`: application commands and business rules.
- `internal/infra/*`: adapters for memory, MongoDB, Redis, Kafka, LiveKit, Centrifugo, S3, and media playback URLs.
- `internal/transport/http`: chi router and JSON handlers.

Listeners never receive LiveKit tokens. A listener receives a playback URL and heartbeat URLs. A user receives a LiveKit token only when their role is owner/admin/moderator or their speaker request has been approved.

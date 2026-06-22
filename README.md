# WaveCast

WaveCast is a Go-powered, Clubhouse-style voice room platform designed around two separate media paths:

- Speakers, owners, admins, and moderators publish through LiveKit.
- Passive listeners receive HLS/LL-HLS playback URLs and use native players.

The backend exposes REST commands, emits durable Kafka events, issues LiveKit and Centrifugo tokens, and keeps the module boundaries small enough to test each layer independently.

## Local Development

Run only the API with the in-memory store:

```sh
make run
```

Run the full dependency stack:

```sh
docker compose -f deploy/docker-compose.yml up --build
```

API:

```text
http://localhost:8080
```

Useful endpoints:

```text
GET  /healthz
GET  /readyz
POST /v1/rooms
POST /v1/rooms/{roomId}/start
POST /v1/rooms/{roomId}/join
POST /v1/rooms/{roomId}/speaker-requests
GET  /v1/realtime/token
```

## Project Layout

```text
cmd/api                     REST API process
cmd/worker                  async worker process
cmd/realtime-dispatcher     Kafka-to-Centrifugo dispatcher process
internal/domain/voice       domain types and event contracts
internal/app/voiceapp       application services and commands
internal/infra              MongoDB, Kafka, LiveKit, Centrifugo, media adapters
internal/transport/http     chi router and handlers
deploy/docker-compose.yml   development dependency stack
api/openapi.yaml            API contract
docs/                       architecture and client notes
```

For fast local tests, the API defaults to `STORAGE_DRIVER=memory`. Set `STORAGE_DRIVER=mongo` to use MongoDB. Kafka, LiveKit, Centrifugo, MongoDB, Redis, MinIO, and SRS are included in Compose so integration work can be enabled without changing the application surface.

## Verification

```sh
go test ./...
go build ./...
docker compose -f deploy/docker-compose.yml config
```

# Deployment

Development:

```sh
docker compose -f deploy/docker-compose.yml up --build
```

Services:

- `api`: Go REST API.
- `worker`: async worker process shell.
- `realtime-dispatcher`: Kafka-to-Centrifugo process shell.
- `mongo`: durable state.
- `redis`: ephemeral state and LiveKit coordination.
- `kafka`: durable backend event backbone.
- `livekit`: SFU for speakers/admins/moderators.
- `centrifugo`: realtime client event delivery.
- `srs`: local HLS origin.
- `minio`: S3-compatible recording storage.

Use `STORAGE_DRIVER=memory` for fast local development and tests. Use `STORAGE_DRIVER=mongo` when MongoDB persistence is required.

Production deployment should split API, worker, and dispatcher into separately scaled workloads and run Kafka, MongoDB, Redis, LiveKit, Centrifugo, media origin, object storage, and CDN as managed or independently operated services.

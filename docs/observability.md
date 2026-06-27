# Observability

Current implementation:

- JSON structured logs with service and request correlation fields.
- `/healthz` and `/readyz` probes.
- Prometheus config scaffold in `configs/prometheus.yml`.
- Async worker and realtime dispatcher operation logs.

Required next additions:

- HTTP request duration metrics.
- Kafka publish/consume counters and lag metrics.
- Listener session counters.
- Speaker request counters.
- Recording and report job metrics.
- OpenTelemetry trace propagation across API, Kafka, worker, and realtime dispatcher.

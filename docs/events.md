# Events

Kafka events use `voice.<entity>.<action>` names and are stored before publishing.

Implemented event names:

```text
voice.room.created
voice.room.started
voice.room.finished
voice.listener.session.started
voice.listener.session.heartbeat_received
voice.listener.session.left
voice.speaker.requested
voice.speaker.approved
voice.speaker.declined
voice.speaker.revoked
voice.moderation.user_removed
voice.recording.started
voice.recording.completed
voice.report.completed
```

Envelope:

```json
{
  "eventId": "evt_...",
  "eventType": "voice.room.started",
  "eventVersion": 1,
  "roomId": "room_...",
  "actorUserId": "usr_...",
  "targetUserId": "usr_...",
  "correlationId": "corr_...",
  "occurredAt": "2026-06-22T00:00:00Z",
  "payload": {}
}
```

Client event mapping is handled by the realtime dispatcher process. The current dispatcher process is scaffolded; the Kafka consumer and Centrifugo publish loop are the next integration step.

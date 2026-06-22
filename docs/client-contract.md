# Client Contract

## Listener

Listeners call `POST /v1/rooms/{roomId}/join` and receive:

```json
{
  "mediaPath": "ll_hls",
  "listener": {
    "protocol": "ll_hls",
    "playbackUrl": "http://localhost:3333/live/room_.../index.m3u8",
    "sessionId": "lsn_...",
    "heartbeatIntervalSeconds": 30
  }
}
```

The client should:

- Play `playbackUrl` with AVPlayer, ExoPlayer, hls.js, or native Safari HLS.
- Send heartbeat every `heartbeatIntervalSeconds`.
- Stop HLS before requesting a speaker session after approval.

## Speaker

Speakers call `POST /v1/rooms/{roomId}/speaker-session` after approval and receive:

```json
{
  "mediaPath": "livekit",
  "speaker": {
    "provider": "livekit",
    "url": "ws://localhost:7880",
    "token": "...",
    "roomName": "lk_room_...",
    "identity": "usr_..."
  }
}
```

The client should connect with the LiveKit SDK and publish microphone tracks only after receiving this descriptor.

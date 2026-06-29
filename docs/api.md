# API

The API is documented in `api/openapi.yaml`.

Development authentication is intentionally simple: pass the acting user with `X-User-ID` or in the request body as `userId` / `actorUserId`.

Example room flow:

```sh
curl -s http://localhost:8080/v1/rooms \
  -H 'Content-Type: application/json' \
  -d '{"title":"Engineering Live","ownerId":"usr_owner"}'
```

```sh
curl -s http://localhost:8080/v1/rooms/{roomId}/start \
  -H 'Content-Type: application/json' \
  -d '{"actorUserId":"usr_owner"}'
```

Listener join:

```sh
curl -s http://localhost:8080/v1/rooms/{roomId}/join \
  -H 'Content-Type: application/json' \
  -d '{"userId":"usr_listener"}'
```

Speaker promotion:

```sh
curl -s http://localhost:8080/v1/rooms/{roomId}/speaker-requests \
  -H 'Content-Type: application/json' \
  -d '{"userId":"usr_listener"}'
```

```sh
curl -s http://localhost:8080/v1/rooms/{roomId}/speaker-requests/{requestId}/approve \
  -H 'Content-Type: application/json' \
  -d '{"actorUserId":"usr_owner"}'
```

```sh
curl -s http://localhost:8080/v1/rooms/{roomId}/speaker-session \
  -H 'Content-Type: application/json' \
  -d '{"userId":"usr_listener"}'
```

Profile and device setup:

```sh
curl -s http://localhost:8080/v1/users/user_brian/profile
```

```sh
curl -s -X PATCH http://localhost:8080/v1/users/user_brian/profile \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Brian Miller","username":"brian.miller","bio":"Host of practical AI rooms."}'
```

```sh
curl -s -X PUT http://localhost:8080/v1/users/user_brian/profile/avatar \
  -H 'Content-Type: application/json' \
  -d '{"avatarUrl":"https://example.test/avatar.png","avatarFileName":"avatar.png"}'
```

```sh
curl -s -X DELETE http://localhost:8080/v1/users/user_brian/profile/avatar
```

```sh
curl -s -X PUT http://localhost:8080/v1/users/user_brian/device-settings \
  -H 'Content-Type: application/json' \
  -d '{"preferredMicrophoneId":"default","preferredSpeakerId":"default","noiseSuppression":true,"echoCancellation":true,"autoGainControl":true,"joinMuted":true}'
```

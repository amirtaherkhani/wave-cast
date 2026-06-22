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

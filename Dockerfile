FROM golang:1.26-alpine AS build

ARG APP=api
WORKDIR /src

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/wave-cast ./cmd/${APP}

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/wave-cast /wave-cast
EXPOSE 8080
ENTRYPOINT ["/wave-cast"]

.PHONY: test build run compose-up compose-down tidy

test:
	go test ./...

build:
	go build ./...

run:
	go run ./cmd/api

compose-up:
	docker compose -f deploy/docker-compose.yml up --build

compose-down:
	docker compose -f deploy/docker-compose.yml down -v

tidy:
	go mod tidy

package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env           string
	ServiceName   string
	StorageDriver string
	HTTP          HTTPConfig
	Mongo         MongoConfig
	Redis         RedisConfig
	Kafka         KafkaConfig
	LiveKit       LiveKitConfig
	Centrifugo    CentrifugoConfig
	Media         MediaConfig
	Listener      ListenerConfig
	Recording     RecordingConfig
	S3            S3Config
	Async         AsyncConfig
}

type HTTPConfig struct {
	Addr           string
	AllowedOrigins []string
}

type MongoConfig struct {
	URI      string
	Database string
}

type RedisConfig struct {
	Enabled  bool
	Addr     string
	Password string
	DB       int
}

type KafkaConfig struct {
	Enabled        bool
	Brokers        []string
	ClientID       string
	VoiceEvents    string
	VoiceJobs      string
	AnalyticsTopic string
}

type LiveKitConfig struct {
	URL       string
	APIKey    string
	APISecret string
	TokenTTL  time.Duration
}

type CentrifugoConfig struct {
	URL                string
	APIKey             string
	TokenSecret        string
	ConnectionTokenTTL time.Duration
	SubscriptionTTL    time.Duration
}

type MediaConfig struct {
	PassiveEnabled  bool
	PassiveMode     string
	OriginBaseURL   string
	CDNBaseURL      string
	Protocol        string
	LatencyProfile  string
	SegmentMS       int
	PartMS          int
	TargetLatencyMS int
}

type ListenerConfig struct {
	HeartbeatInterval time.Duration
	SessionTimeout    time.Duration
}

type RecordingConfig struct {
	Enabled          bool
	AutoStart        bool
	RetentionEnabled bool
	RetentionDays    int
}

type S3Config struct {
	Endpoint         string
	Bucket           string
	Region           string
	AccessKeyID      string
	SecretAccessKey  string
	RecordingsPrefix string
	PresignedURLTTL  time.Duration
}

type AsyncConfig struct {
	WorkerEnabled                  bool
	WorkerConcurrency              int
	JobMaxAttempts                 int
	JobVisibilityTimeout           time.Duration
	JobRetryBaseDelay              time.Duration
	JobRetryMaxDelay               time.Duration
	JobLockTTL                     time.Duration
	JobDeadLetterEnabled           bool
	SchedulerEnabled               bool
	ExpireListenerSessionsInterval time.Duration
	ExpireRecordingsInterval       time.Duration
	SyncRoomCountsInterval         time.Duration
}

func Load() Config {
	return Config{
		Env:           str("APP_ENV", "local"),
		ServiceName:   str("SERVICE_NAME", "wave-cast-api"),
		StorageDriver: str("STORAGE_DRIVER", "memory"),
		HTTP: HTTPConfig{
			Addr:           str("HTTP_ADDR", ":8080"),
			AllowedOrigins: csv("HTTP_ALLOWED_ORIGINS", "*"),
		},
		Mongo: MongoConfig{
			URI:      str("MONGO_URI", "mongodb://localhost:27017"),
			Database: str("MONGO_DATABASE", "wave_cast"),
		},
		Redis: RedisConfig{
			Enabled:  boolean("REDIS_ENABLED", false),
			Addr:     str("REDIS_ADDR", "localhost:6379"),
			Password: str("REDIS_PASSWORD", ""),
			DB:       integer("REDIS_DB", 0),
		},
		Kafka: KafkaConfig{
			Enabled:        boolean("KAFKA_ENABLED", false),
			Brokers:        csv("KAFKA_BROKERS", "localhost:29092"),
			ClientID:       str("KAFKA_CLIENT_ID", "wave-cast"),
			VoiceEvents:    str("KAFKA_TOPIC_VOICE_EVENTS", "voice.events"),
			VoiceJobs:      str("KAFKA_TOPIC_VOICE_JOBS", "voice.jobs"),
			AnalyticsTopic: str("KAFKA_TOPIC_ANALYTICS", "voice.analytics.events"),
		},
		LiveKit: LiveKitConfig{
			URL:       str("LIVEKIT_URL", "ws://localhost:7880"),
			APIKey:    str("LIVEKIT_API_KEY", "devkey"),
			APISecret: str("LIVEKIT_API_SECRET", "devsecret"),
			TokenTTL:  seconds("LIVEKIT_TOKEN_TTL_SECONDS", 3600),
		},
		Centrifugo: CentrifugoConfig{
			URL:                str("CENTRIFUGO_URL", "http://localhost:8000"),
			APIKey:             str("CENTRIFUGO_API_KEY", "dev_centrifugo_api_key"),
			TokenSecret:        str("CENTRIFUGO_TOKEN_SECRET", "dev_centrifugo_secret"),
			ConnectionTokenTTL: seconds("CENTRIFUGO_CONNECTION_TOKEN_TTL_SECONDS", 3600),
			SubscriptionTTL:    seconds("CENTRIFUGO_SUBSCRIPTION_TOKEN_TTL_SECONDS", 600),
		},
		Media: MediaConfig{
			PassiveEnabled:  boolean("MEDIA_PASSIVE_ENABLED", true),
			PassiveMode:     str("MEDIA_PASSIVE_MODE", "origin"),
			OriginBaseURL:   trimRightSlash(str("MEDIA_ORIGIN_BASE_URL", "http://localhost:3333")),
			CDNBaseURL:      trimRightSlash(str("MEDIA_CDN_BASE_URL", "")),
			Protocol:        str("LISTENER_STREAM_PROTOCOL", "ll_hls"),
			LatencyProfile:  str("LISTENER_STREAM_LATENCY_PROFILE", "low_latency"),
			SegmentMS:       integer("LISTENER_STREAM_SEGMENT_DURATION_MS", 1000),
			PartMS:          integer("LISTENER_STREAM_PART_DURATION_MS", 250),
			TargetLatencyMS: integer("LISTENER_STREAM_TARGET_LATENCY_MS", 3000),
		},
		Listener: ListenerConfig{
			HeartbeatInterval: seconds("LISTENER_HEARTBEAT_INTERVAL_SECONDS", 30),
			SessionTimeout:    seconds("LISTENER_SESSION_TIMEOUT_SECONDS", 90),
		},
		Recording: RecordingConfig{
			Enabled:          boolean("RECORDING_ENABLED", true),
			AutoStart:        boolean("RECORDING_AUTO_START", false),
			RetentionEnabled: boolean("RECORDING_RETENTION_ENABLED", true),
			RetentionDays:    integer("RECORDING_RETENTION_DAYS", 30),
		},
		S3: S3Config{
			Endpoint:         str("S3_ENDPOINT", "http://localhost:9000"),
			Bucket:           str("S3_BUCKET", "wave-cast-media"),
			Region:           str("S3_REGION", "us-east-1"),
			AccessKeyID:      str("S3_ACCESS_KEY_ID", "minioadmin"),
			SecretAccessKey:  str("S3_SECRET_ACCESS_KEY", "minioadmin"),
			RecordingsPrefix: str("S3_RECORDINGS_PREFIX", "recordings"),
			PresignedURLTTL:  seconds("S3_PRESIGNED_URL_TTL_SECONDS", 900),
		},
		Async: AsyncConfig{
			WorkerEnabled:                  boolean("ASYNC_WORKER_ENABLED", true),
			WorkerConcurrency:              integer("ASYNC_WORKER_CONCURRENCY", 10),
			JobMaxAttempts:                 integer("ASYNC_JOB_MAX_ATTEMPTS", 5),
			JobVisibilityTimeout:           seconds("ASYNC_JOB_VISIBILITY_TIMEOUT_SECONDS", 300),
			JobRetryBaseDelay:              seconds("ASYNC_JOB_RETRY_BASE_DELAY_SECONDS", 5),
			JobRetryMaxDelay:               seconds("ASYNC_JOB_RETRY_MAX_DELAY_SECONDS", 300),
			JobLockTTL:                     seconds("ASYNC_JOB_LOCK_TTL_SECONDS", 300),
			JobDeadLetterEnabled:           boolean("ASYNC_JOB_DEAD_LETTER_ENABLED", true),
			SchedulerEnabled:               boolean("ASYNC_SCHEDULER_ENABLED", true),
			ExpireListenerSessionsInterval: seconds("ASYNC_EXPIRE_LISTENER_SESSIONS_INTERVAL_SECONDS", 30),
			ExpireRecordingsInterval:       seconds("ASYNC_EXPIRE_RECORDINGS_INTERVAL_SECONDS", 3600),
			SyncRoomCountsInterval:         seconds("ASYNC_SYNC_ROOM_COUNTS_INTERVAL_SECONDS", 60),
		},
	}
}

func str(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func csv(key, fallback string) []string {
	raw := str(key, fallback)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func boolean(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func integer(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func seconds(key string, fallback int) time.Duration {
	return time.Duration(integer(key, fallback)) * time.Second
}

func trimRightSlash(value string) string {
	return strings.TrimRight(value, "/")
}

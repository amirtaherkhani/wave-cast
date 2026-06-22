package logger

import (
	"context"
	"log/slog"
	"os"
)

func New(env string) *slog.Logger {
	opts := &slog.HandlerOptions{AddSource: env == "local", Level: slog.LevelInfo}
	return slog.New(slog.NewJSONHandler(os.Stdout, opts))
}

func With(ctx context.Context, base *slog.Logger, args ...any) *slog.Logger {
	traceID, _ := ctx.Value("trace_id").(string)
	correlationID, _ := ctx.Value("correlation_id").(string)
	if traceID != "" {
		args = append(args, "trace_id", traceID)
	}
	if correlationID != "" {
		args = append(args, "correlation_id", correlationID)
	}
	return base.With(args...)
}

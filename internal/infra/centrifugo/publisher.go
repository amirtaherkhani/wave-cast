package centrifugo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Publisher struct {
	url    string
	apiKey string
	client *http.Client
}

func NewPublisher(url, apiKey string) *Publisher {
	return &Publisher{
		url:    strings.TrimRight(url, "/") + "/api",
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (p *Publisher) Publish(ctx context.Context, channel string, data any) error {
	body, err := json.Marshal(map[string]any{
		"method": "publish",
		"params": map[string]any{
			"channel": channel,
			"data":    data,
		},
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "apikey "+p.apiKey)
	req.Header.Set("X-API-Key", p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("centrifugo publish failed: status=%d", resp.StatusCode)
	}
	return nil
}

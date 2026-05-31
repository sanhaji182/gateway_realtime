// Package webhook mengirim event lifecycle channel (occupied/vacated/member) dari core
// ke endpoint HTTP yang dikonfigurasi via env GATEWAY_WEBHOOKS (JSON array).
// Setiap pengiriman ditandatangani HMAC (X-Gateway-Signature) dan dicatat ke Redis
// list "webhook:logs" (sama dengan yang dibaca halaman Webhooks dashboard).
package webhook

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

type config struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
	Secret string   `json:"secret"`
}

// Dispatcher mengirim webhook lifecycle. Dibuat sekali saat startup.
type Dispatcher struct {
	Redis  *goredis.Client
	hooks  []config
	client *http.Client
}

// NewDispatcher memuat konfigurasi dari env GATEWAY_WEBHOOKS.
func NewDispatcher(redis *goredis.Client) *Dispatcher {
	var hooks []config
	if raw := os.Getenv("GATEWAY_WEBHOOKS"); raw != "" {
		_ = json.Unmarshal([]byte(raw), &hooks)
	}
	return &Dispatcher{Redis: redis, hooks: hooks, client: &http.Client{Timeout: 5 * time.Second}}
}

// Enabled true bila ada webhook terkonfigurasi.
func (d *Dispatcher) Enabled() bool { return len(d.hooks) > 0 }

// match mencocokkan nama event dengan pola: "*", persis, atau prefix "x.*".
func match(patterns []string, event string) bool {
	for _, p := range patterns {
		if p == "*" || p == event || (strings.HasSuffix(p, ".*") && strings.HasPrefix(event, strings.TrimSuffix(p, "*"))) {
			return true
		}
	}
	return false
}

// Dispatch mengirim event lifecycle ke semua webhook yang cocok (async, non-blocking).
func (d *Dispatcher) Dispatch(event, channel string, data any) {
	if len(d.hooks) == 0 {
		return
	}
	body, _ := json.Marshal(map[string]any{"event": event, "channel": channel, "data": data, "ts": time.Now().UnixMilli()})
	for _, h := range d.hooks {
		if match(h.Events, event) {
			go d.deliver(h, event, channel, body)
		}
	}
}

func (d *Dispatcher) deliver(h config, event, channel string, body []byte) {
	req, err := http.NewRequest(http.MethodPost, h.URL, bytes.NewReader(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if h.Secret != "" {
		mac := hmac.New(sha256.New, []byte(h.Secret))
		mac.Write(body)
		req.Header.Set("X-Gateway-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	}
	start := time.Now()
	status, ok := 0, false
	if resp, err := d.client.Do(req); err == nil {
		status = resp.StatusCode
		ok = status >= 200 && status < 300
		_ = resp.Body.Close()
	}
	d.log(event, channel, h.URL, status, ok, time.Since(start))
}

// log menulis hasil delivery ke Redis (format sama dengan log webhook dashboard).
func (d *Dispatcher) log(event, channel, url string, status int, ok bool, latency time.Duration) {
	if d.Redis == nil {
		return
	}
	st := "failed"
	if ok {
		st = "success"
	}
	entry, _ := json.Marshal(map[string]any{
		"id": fmt.Sprintf("whl_%d", time.Now().UnixNano()), "app_id": "", "app_name": channel,
		"endpoint_url": url, "event": event, "status": st, "http_code": status,
		"latency_ms": latency.Milliseconds(), "attempt": 1, "triggered_at": time.Now().UTC().Format(time.RFC3339),
	})
	ctx := context.Background()
	d.Redis.LPush(ctx, "webhook:logs", entry)
	d.Redis.LTrim(ctx, "webhook:logs", 0, 199)
	d.Redis.Expire(ctx, "webhook:logs", 604800)
}

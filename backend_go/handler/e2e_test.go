package handler

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"go-gateway/config"
	"go-gateway/extensions"
	"go-gateway/hub"
	redisSub "go-gateway/redis"

	"github.com/gorilla/websocket"
	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// signJWT membuat token HS256 minimal untuk handshake WebSocket.
func signJWT(secret, userID string) string {
	enc := base64.RawURLEncoding
	header := enc.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payloadJSON, _ := json.Marshal(map[string]any{"user_id": userID, "role": "user", "exp": time.Now().Add(time.Hour).Unix()})
	payload := enc.EncodeToString(payloadJSON)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(header + "." + payload))
	return header + "." + payload + "." + enc.EncodeToString(mac.Sum(nil))
}

// TestWSEndToEnd menguji jalur penuh: handshake → subscribe → publish via Redis → terima event.
// Hanya berjalan bila REDIS_TEST_URL diset (di CI memakai service redis).
func TestWSEndToEnd(t *testing.T) {
	url := os.Getenv("REDIS_TEST_URL")
	if url == "" {
		t.Skip("set REDIS_TEST_URL untuk menjalankan e2e test")
	}
	opt, err := goredis.ParseURL(url)
	if err != nil {
		t.Fatalf("REDIS_TEST_URL invalid: %v", err)
	}
	rc := goredis.NewClient(opt)
	defer rc.Close()

	const secret = "e2e-secret"
	h := hub.New(zerolog.Nop())
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go redisSub.Subscriber{Client: rc, Hub: h, Log: zerolog.Nop()}.Run(ctx)
	time.Sleep(200 * time.Millisecond) // tunggu PSUBSCRIBE aktif

	wsh := WSHandler{
		Config:    config.Config{JWTSecret: secret, PingInterval: 30 * time.Second, AllowedOrigins: []string{"*"}},
		Hub:       h,
		Log:       zerolog.Nop(),
		EventHook: extensions.NoopEventHook{}, RateLimiter: extensions.NoopRateLimiter{}, Auth: extensions.NoopAuth{},
		Redis: rc,
	}
	srv := httptest.NewServer(wsh)
	defer srv.Close()

	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/?token=" + signJWT(secret, "u1")
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer conn.Close()

	readEvent := func() map[string]any {
		_ = conn.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, b, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		var m map[string]any
		_ = json.Unmarshal(b, &m)
		return m
	}

	if m := readEvent(); m["event"] != "connected" {
		t.Fatalf("expected connected, got %v", m)
	}
	_ = conn.WriteMessage(websocket.TextMessage, []byte(`{"type":"subscribe","channel":"e2e.test"}`))
	if m := readEvent(); m["event"] != "subscription_succeeded" {
		t.Fatalf("expected subscription_succeeded, got %v", m)
	}
	// Publish lewat Redis → harus difan-out ke koneksi.
	rc.Publish(ctx, "events.e2e.test", `{"type":"event","channel":"e2e.test","event":"ping","data":{"n":1}}`)
	if m := readEvent(); m["event"] != "ping" {
		t.Fatalf("expected ping event, got %v", m)
	}
}

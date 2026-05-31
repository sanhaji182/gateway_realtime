package webhook

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

// TestDispatcherDelivers menguji jalur webhook: Dispatch → POST ke endpoint dgn HMAC → log ke Redis.
// Hanya berjalan bila REDIS_TEST_URL diset (di CI memakai service redis).
func TestDispatcherDelivers(t *testing.T) {
	url := os.Getenv("REDIS_TEST_URL")
	if url == "" {
		t.Skip("set REDIS_TEST_URL untuk menjalankan integration test webhook")
	}
	received := make(chan string, 1)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		received <- r.Header.Get("X-Gateway-Signature")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	os.Setenv("GATEWAY_WEBHOOKS", `[{"url":"`+srv.URL+`","events":["*"],"secret":"whsec"}]`)
	defer os.Unsetenv("GATEWAY_WEBHOOKS")

	opt, err := goredis.ParseURL(url)
	if err != nil {
		t.Fatalf("REDIS_TEST_URL invalid: %v", err)
	}
	rc := goredis.NewClient(opt)
	defer rc.Close()
	rc.Del(context.Background(), "webhook:logs")

	d := NewDispatcher(rc)
	if !d.Enabled() {
		t.Fatal("dispatcher harus enabled saat GATEWAY_WEBHOOKS diset")
	}
	d.Dispatch("channel_occupied", "room", nil)

	select {
	case sig := <-received:
		if !strings.HasPrefix(sig, "sha256=") {
			t.Fatalf("signature tidak valid: %q", sig)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("webhook tidak diterima endpoint")
	}

	time.Sleep(200 * time.Millisecond) // tunggu log async tertulis
	if n, _ := rc.LLen(context.Background(), "webhook:logs").Result(); n < 1 {
		t.Fatal("log webhook tidak tertulis ke Redis")
	}
}

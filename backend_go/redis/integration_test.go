package redis

import (
	"context"
	"os"
	"testing"
	"time"

	"go-gateway/hub"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// TestRedisFanoutIntegration menguji jalur nyata: PUBLISH ke Redis events.<channel>
// harus di-fanout oleh Subscriber ke client yang subscribe di Hub.
// Hanya berjalan bila REDIS_TEST_URL diset (di CI memakai service redis).
func TestRedisFanoutIntegration(t *testing.T) {
	url := os.Getenv("REDIS_TEST_URL")
	if url == "" {
		t.Skip("set REDIS_TEST_URL untuk menjalankan integration test")
	}
	opt, err := goredis.ParseURL(url)
	if err != nil {
		t.Fatalf("REDIS_TEST_URL invalid: %v", err)
	}
	client := goredis.NewClient(opt)
	defer client.Close()

	h := hub.New(zerolog.Nop())
	c := hub.NewClient(h, nil, "u1", "user", "s1", zerolog.Nop())
	h.Register(c)
	h.JoinChannel(c, "itest", nil)
	<-c.Send // buang subscription_succeeded

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go Subscriber{Client: client, Hub: h, Log: zerolog.Nop()}.Run(ctx)
	time.Sleep(300 * time.Millisecond) // beri waktu PSUBSCRIBE aktif

	client.Publish(ctx, "events.itest", `{"type":"event","channel":"itest","event":"e","data":{"n":1}}`)

	select {
	case <-c.Send:
		// fan-out berhasil sampai ke client
	case <-time.After(2 * time.Second):
		t.Fatal("event tidak sampai ke client lewat Redis fan-out")
	}
}

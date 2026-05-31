package hub

import (
	"testing"

	"github.com/rs/zerolog"
)

func testClient(h *Hub, userID, socketID, role string) *Client {
	return NewClient(h, nil, userID, role, socketID, zerolog.Nop())
}

// drain mengambil semua payload yang sudah antri di Send tanpa blocking.
func drain(c *Client) int {
	n := 0
	for {
		select {
		case <-c.Send:
			n++
		default:
			return n
		}
	}
}

func TestSendToChannelFanout(t *testing.T) {
	h := New(zerolog.Nop())
	a, b := testClient(h, "ua", "s1", "user"), testClient(h, "ub", "s2", "user")
	h.Register(a)
	h.Register(b)
	h.JoinChannel(a, "orders", nil)
	h.JoinChannel(b, "orders", nil)
	drain(a)
	drain(b) // buang subscription_succeeded
	h.SendToChannel("orders", []byte(`{"event":"x"}`))
	if drain(a) != 1 || drain(b) != 1 {
		t.Fatal("kedua subscriber harus menerima 1 pesan")
	}
}

func TestWildcardDelivery(t *testing.T) {
	h := New(zerolog.Nop())
	w := testClient(h, "uw", "sw", "admin")    // pola wildcard yang cocok
	x := testClient(h, "ux", "sx", "user")     // subscriber exact
	other := testClient(h, "uo", "so", "admin") // pola wildcard yang TIDAK cocok
	for _, c := range []*Client{w, x, other} {
		h.Register(c)
	}
	h.JoinChannel(w, "orders.*", nil)
	h.JoinChannel(x, "orders.123", nil)
	h.JoinChannel(other, "alerts.*", nil)
	drain(w)
	drain(x)
	drain(other)
	h.SendToChannel("orders.123", []byte(`{"event":"new"}`))
	if got := drain(w); got != 1 {
		t.Fatalf("subscriber wildcard cocok harus menerima, got %d", got)
	}
	if got := drain(x); got != 1 {
		t.Fatalf("subscriber exact harus menerima, got %d", got)
	}
	if got := drain(other); got != 0 {
		t.Fatalf("wildcard tidak cocok TIDAK boleh menerima, got %d", got)
	}
}

func TestPresenceSnapshot(t *testing.T) {
	h := New(zerolog.Nop())
	a := testClient(h, "ua", "s1", "user")
	h.Register(a)
	h.JoinChannel(a, "presence-room", &PresenceMember{UserID: "ua", UserInfo: map[string]any{"name": "A"}})
	if drain(a) == 0 {
		t.Fatal("join presence harus mengirim subscription_succeeded")
	}
	var found bool
	for _, c := range h.Snapshot().Channels {
		if c.Name == "presence-room" {
			found = true
			if !c.Presence || c.Subscribers != 1 {
				t.Fatalf("presence channel salah: presence=%v subs=%d", c.Presence, c.Subscribers)
			}
		}
	}
	if !found {
		t.Fatal("presence channel hilang dari snapshot")
	}
}

func TestSnapshotAndLeave(t *testing.T) {
	h := New(zerolog.Nop())
	a := testClient(h, "ua", "s1", "user")
	h.Register(a)
	h.JoinChannel(a, "orders", nil)
	s := h.Snapshot()
	if s.TotalConnections != 1 || s.TotalChannels != 1 {
		t.Fatalf("snapshot awal salah: conns=%d channels=%d", s.TotalConnections, s.TotalChannels)
	}
	if !h.HasSocket("s1") {
		t.Fatal("HasSocket(s1) harus true")
	}
	h.LeaveChannel(a, "orders")
	if h.Snapshot().TotalChannels != 0 {
		t.Fatal("channel harus hilang setelah leave terakhir")
	}
}

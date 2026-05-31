package redis

import (
	"context"
	"encoding/json"
	"time"

	"go-gateway/hub"

	goredis "github.com/redis/go-redis/v9"
)

// presenceTTL membatasi umur hash presence agar sisa (orphan) dari node yang
// crash mendadak otomatis terbersihkan. Node yang masih punya subscriber di
// channel akan me-refresh TTL secara periodik (lihat RefreshPresence).
const presenceTTL = 90 * time.Second

// Presence mengimplementasikan hub.Broadcaster memakai Redis sebagai shared state.
//
// State presence disimpan di hash "presence:<channel>" (field=socketID, value=member JSON)
// sehingga setiap node bisa membaca daftar member lengkap lintas-node. System event
// (member_added/removed) dipublish ke "events.<channel>" agar Subscriber tiap node
// mem-fanout ke koneksi lokalnya — satu kali per node, tanpa duplikasi.
//
// Catatan: entri presence dibersihkan saat leave/disconnect normal. Jika sebuah node
// crash, entri bisa tertinggal (follow-up: heartbeat TTL).
type Presence struct {
	Client *goredis.Client
}

func presenceKey(channel string) string { return "presence:" + channel }

// JoinPresence menyimpan member lalu mengembalikan seluruh member di channel.
func (p Presence) JoinPresence(channel, socketID string, member hub.PresenceMember) []hub.PresenceMember {
	ctx := context.Background()
	if b, err := json.Marshal(member); err == nil {
		p.Client.HSet(ctx, presenceKey(channel), socketID, b)
		p.Client.Expire(ctx, presenceKey(channel), presenceTTL) // perpanjang umur saat ada aktivitas
	}
	all, err := p.Client.HGetAll(ctx, presenceKey(channel)).Result()
	members := make([]hub.PresenceMember, 0, len(all))
	if err != nil {
		return members
	}
	for _, v := range all {
		var m hub.PresenceMember
		if json.Unmarshal([]byte(v), &m) == nil {
			members = append(members, m)
		}
	}
	return members
}

// LeavePresence menghapus member; mengembalikannya jika sebelumnya ada.
func (p Presence) LeavePresence(channel, socketID string) (hub.PresenceMember, bool) {
	ctx := context.Background()
	val, err := p.Client.HGet(ctx, presenceKey(channel), socketID).Result()
	if err != nil {
		return hub.PresenceMember{}, false
	}
	p.Client.HDel(ctx, presenceKey(channel), socketID)
	var m hub.PresenceMember
	if json.Unmarshal([]byte(val), &m) != nil {
		return hub.PresenceMember{}, false
	}
	return m, true
}

// PublishSystem mendistribusikan system event ke semua node lewat channel events.<channel>.
func (p Presence) PublishSystem(channel string, payload []byte) {
	p.Client.Publish(context.Background(), "events."+channel, payload)
}

// RefreshPresence memperpanjang TTL hash presence untuk channel yang masih punya
// subscriber di node ini. Dipanggil periodik dari main agar presence aktif tidak
// expired, sementara sisa dari node yang crash akan kedaluwarsa sendiri.
func (p Presence) RefreshPresence(channels []string) {
	ctx := context.Background()
	for _, ch := range channels {
		p.Client.Expire(ctx, presenceKey(ch), presenceTTL)
	}
}

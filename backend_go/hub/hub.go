// Package hub mengelola registry koneksi WebSocket, channel subscription, dan presence state.
// File ini menjadi pusat sinkronisasi karena diakses oleh handler HTTP, ReadPump, WritePump, dan Redis subscriber.
package hub

import (
	"encoding/json"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

// Hub menyimpan semua state realtime yang hanya hidup di memory.
// Diakses dari banyak goroutine sekaligus, sehingga setiap akses map harus melalui mutex.
type Hub struct {
	mu        sync.RWMutex                         // Melindungi users, channels, dan presence dari race condition.
	users     map[string]map[string]*Client        // Map userId -> socketId -> Client untuk mendukung multi-tab.
	channels  map[string]map[string]*Client        // Map channel -> socketId -> Client untuk fan-out channel.
	presence  map[string]map[string]PresenceMember // Map presence channel -> socketId -> member aktif.
	startedAt time.Time                            // Waktu service mulai untuk menghitung uptime health check.
	log       zerolog.Logger                       // Logger Hub untuk error internal dan observability.
}

// PresenceMember merepresentasikan satu member aktif di presence channel.
// State ini dimiliki Hub dan dibersihkan saat socket leave atau disconnect.
type PresenceMember struct {
	UserID   string         `json:"user_id"`   // Identitas user yang tampil ke subscriber presence.
	UserInfo map[string]any `json:"user_info"` // Metadata non-sensitif seperti nama, avatar, atau role.
	SocketID string         `json:"socket_id"` // Socket pemilik member; V1 menghitung presence per-socket.
}

// EventEnvelope adalah format standar event yang dikirim ke browser.
// Struct ini dipakai untuk system event internal dan validasi ringan payload Redis.
type EventEnvelope struct {
	Type    string         `json:"type"`              // Jenis envelope, misalnya event atau system.
	Channel string         `json:"channel,omitempty"` // Channel tujuan; kosong untuk sebagian system event global.
	Event   string         `json:"event"`             // Nama event dot-notation atau system event.
	Data    any            `json:"data"`              // Payload event yang dikonsumsi SDK/browser.
	TS      int64          `json:"ts,omitempty"`      // Unix milliseconds agar client bisa dedupe/order ringan.
	Meta    map[string]any `json:"meta,omitempty"`    // Metadata opsional seperti request_id atau trace_id.
}

// New membuat Hub kosong saat aplikasi start.
// Hub tidak menjalankan goroutine sendiri; caller mengoper Hub ke handler dan subscriber.
func New(log zerolog.Logger) *Hub {
	return &Hub{users: map[string]map[string]*Client{}, channels: map[string]map[string]*Client{}, presence: map[string]map[string]PresenceMember{}, startedAt: time.Now(), log: log}
}

// Register mendaftarkan client baru setelah WebSocket berhasil di-upgrade.
// Mengambil write lock karena memodifikasi map users.
func (h *Hub) Register(c *Client) {
	h.mu.Lock() // Write lock melindungi pembuatan bucket user dan insert socket baru.
	defer h.mu.Unlock()
	if h.users[c.UserID] == nil {
		h.users[c.UserID] = map[string]*Client{}
	}
	h.users[c.UserID][c.SocketID] = c
}

// Unregister menghapus client dari user registry dan semua channel yang diikuti.
// Dipanggil oleh ReadPump saat koneksi berakhir; send channel ditutup agar WritePump ikut berhenti.
func (h *Hub) Unregister(c *Client) {
	h.mu.Lock() // Write lock karena users dimutasi dan snapshot channel client perlu konsisten.
	channels := make([]string, 0, len(c.Channels))
	for channel := range c.Channels {
		channels = append(channels, channel)
	}
	delete(h.users[c.UserID], c.SocketID)
	if len(h.users[c.UserID]) == 0 {
		delete(h.users, c.UserID)
	}
	h.mu.Unlock()
	// LeaveChannel dipanggil setelah unlock agar broadcast presence tidak dilakukan saat mutex masih dipegang.
	for _, channel := range channels {
		h.LeaveChannel(c, channel)
	}
	// Menutup Send memberi sinyal ke WritePump bahwa client sudah unregister dan harus mengirim close frame.
	close(c.Send)
}

// SendToUser mengirim payload ke semua socket aktif milik satu user.
// Fungsi ini memakai snapshot agar lock tidak tertahan oleh client lambat saat Enqueue.
func (h *Hub) SendToUser(userID string, payload []byte) {
	h.mu.RLock() // RLock cukup karena hanya membaca map users untuk membuat snapshot.
	clients := snapshot(h.users[userID])
	h.mu.RUnlock()
	for _, c := range clients {
		c.Enqueue(payload)
	}
}

// SendToChannel mengirim payload ke semua subscriber channel tertentu.
// Wildcard dievaluasi saat read lock masih aktif agar view map channels konsisten.
func (h *Hub) SendToChannel(channel string, payload []byte) {
	h.mu.RLock() // RLock cukup karena fan-out hanya membaca daftar subscriber.
	clients := snapshot(h.channels[channel])
	if strings.Contains(channel, "*") {
		clients = append(clients, h.matchWildcardLocked(channel)...)
	}
	h.mu.RUnlock()
	// Enqueue dilakukan setelah unlock agar operasi channel client tidak memblokir map Hub.
	for _, c := range clients {
		c.Enqueue(payload)
	}
}

// Broadcast mengirim payload ke seluruh koneksi aktif di Hub.
// Dipakai untuk event global dan tetap melakukan snapshot sebelum enqueue.
func (h *Hub) Broadcast(payload []byte) {
	h.mu.RLock() // RLock dipakai karena seluruh map users hanya dibaca.
	var clients []*Client
	for _, group := range h.users {
		clients = append(clients, snapshot(group)...)
	}
	h.mu.RUnlock()
	for _, c := range clients {
		c.Enqueue(payload)
	}
}

// JoinChannel menambahkan client ke channel public/private/presence.
// Untuk presence, fungsi ini juga menyimpan member lalu mengirim state awal dan event join.
func (h *Hub) JoinChannel(c *Client, channel string, member *PresenceMember) {
	h.mu.Lock() // Write lock wajib karena channels, c.Channels, dan presence dimutasi bersamaan.
	if h.channels[channel] == nil {
		h.channels[channel] = map[string]*Client{}
	}
	h.channels[channel][c.SocketID] = c
	c.Channels[channel] = true
	var members []PresenceMember
	if strings.HasPrefix(channel, "presence-") && member != nil {
		if h.presence[channel] == nil {
			h.presence[channel] = map[string]PresenceMember{}
		}
		member.SocketID = c.SocketID
		h.presence[channel][c.SocketID] = *member
		members = presenceSnapshot(h.presence[channel])
	}
	h.mu.Unlock()
	// Event dikirim setelah unlock agar write ke channel client tidak terjadi saat mutex Hub dipegang.
	if strings.HasPrefix(channel, "presence-") && member != nil {
		h.sendSystem(c, channel, "subscription_succeeded", map[string]any{"members": members, "count": len(members)})
		h.broadcastSystem(channel, "member_added", member)
		return
	}
	h.sendSystem(c, channel, "subscription_succeeded", map[string]any{"channel": channel})
}

// LeaveChannel menghapus client dari channel dan membersihkan presence jika perlu.
// Dipanggil dari unsubscribe eksplisit maupun cleanup disconnect.
func (h *Hub) LeaveChannel(c *Client, channel string) {
	var removed *PresenceMember
	h.mu.Lock() // Write lock karena channels, c.Channels, dan presence dimutasi.
	if clients := h.channels[channel]; clients != nil {
		delete(clients, c.SocketID)
		if len(clients) == 0 {
			delete(h.channels, channel)
		}
	}
	delete(c.Channels, channel)
	if members := h.presence[channel]; members != nil {
		if member, ok := members[c.SocketID]; ok {
			removed = &member
			delete(members, c.SocketID)
			if len(members) == 0 {
				delete(h.presence, channel)
			}
		}
	}
	h.mu.Unlock()
	// Broadcast leave setelah unlock untuk menghindari deadlock saat SendToChannel mengambil RLock.
	if removed != nil {
		h.broadcastSystem(channel, "member_removed", removed)
	}
}

// HasSocket memeriksa apakah socket id masih aktif di Hub.
// Dipakai endpoint auth untuk menolak signature bagi socket yang sudah disconnect.
func (h *Hub) HasSocket(socketID string) bool {
	h.mu.RLock() // RLock cukup karena hanya membaca registry users.
	defer h.mu.RUnlock()
	for _, clients := range h.users {
		if clients[socketID] != nil {
			return true
		}
	}
	return false
}

// Connections menghitung total koneksi aktif di semua user.
// Dipakai health check dan metrics; RLock menjaga hasil tidak race dengan register/unregister.
func (h *Hub) Connections() int {
	h.mu.RLock() // RLock cukup karena hanya membaca panjang map nested.
	defer h.mu.RUnlock()
	total := 0
	for _, clients := range h.users {
		total += len(clients)
	}
	return total
}

// Uptime mengembalikan durasi sejak Hub dibuat.
// Tidak perlu lock karena startedAt immutable setelah inisialisasi.
func (h *Hub) Uptime() time.Duration { return time.Since(h.startedAt) }

// matchWildcardLocked mencari subscriber wildcard yang cocok dengan channel.
// Caller wajib sudah memegang RLock/Lock karena fungsi ini membaca h.channels tanpa lock sendiri.
func (h *Hub) matchWildcardLocked(channel string) []*Client {
	var clients []*Client
	prefix := strings.TrimSuffix(channel, "*")
	for subscribed, group := range h.channels {
		if strings.HasSuffix(subscribed, "*") && strings.HasPrefix(channel, strings.TrimSuffix(subscribed, "*")) || strings.HasPrefix(subscribed, prefix) {
			clients = append(clients, snapshot(group)...)
		}
	}
	return clients
}

// sendSystem mengirim satu system event ke satu client.
// Marshal error tidak dikembalikan karena event system dibentuk dari tipe internal yang terkendali.
func (h *Hub) sendSystem(c *Client, channel, event string, data any) {
	payload, _ := json.Marshal(EventEnvelope{Type: "system", Channel: channel, Event: event, Data: data, TS: time.Now().UnixMilli()})
	c.Enqueue(payload)
}

// broadcastSystem mengirim system event ke semua subscriber channel.
// Fungsi ini sengaja melewati SendToChannel agar locking dan backpressure tetap konsisten.
func (h *Hub) broadcastSystem(channel, event string, data any) {
	payload, _ := json.Marshal(EventEnvelope{Type: "system", Channel: channel, Event: event, Data: data, TS: time.Now().UnixMilli()})
	h.SendToChannel(channel, payload)
}

// snapshot menyalin map client menjadi slice agar caller bisa melepas mutex sebelum enqueue.
// Nil map aman diproses dan menghasilkan slice kosong.
func snapshot(group map[string]*Client) []*Client {
	clients := make([]*Client, 0, len(group))
	for _, client := range group {
		clients = append(clients, client)
	}
	return clients
}

// presenceSnapshot menyalin member presence untuk response subscription_succeeded.
// Snapshot mencegah data berubah saat sedang di-marshal untuk client.
func presenceSnapshot(group map[string]PresenceMember) []PresenceMember {
	members := make([]PresenceMember, 0, len(group))
	for _, member := range group {
		members = append(members, member)
	}
	return members
}

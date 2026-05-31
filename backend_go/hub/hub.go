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
	broadcaster Broadcaster                          // Opsional: distribusi presence & system event lintas-node. Nil = single-node.
	onLifecycle func(event, channel string, data any) // Opsional: hook webhook lifecycle (occupied/vacated/member).
}

// SetLifecycleHook memasang callback untuk event lifecycle channel (untuk webhook).
// event: channel_occupied, channel_vacated, member_added, member_removed.
func (h *Hub) SetLifecycleHook(fn func(event, channel string, data any)) { h.onLifecycle = fn }

// emitLifecycle memanggil hook lifecycle bila terpasang (aman bila nil).
func (h *Hub) emitLifecycle(event, channel string, data any) {
	if h.onLifecycle != nil {
		h.onLifecycle(event, channel, data)
	}
}

// Broadcaster mendistribusikan state presence dan system event lintas node (mis. via Redis).
// Jika nil, Hub berjalan single-node dengan presence in-memory saja.
type Broadcaster interface {
	// JoinPresence menyimpan member ke shared state dan mengembalikan seluruh daftar member.
	JoinPresence(channel, socketID string, member PresenceMember) []PresenceMember
	// LeavePresence menghapus member dari shared state, mengembalikannya jika ada.
	LeavePresence(channel, socketID string) (PresenceMember, bool)
	// PublishSystem mendistribusikan system event agar setiap node mem-fanout lokal.
	PublishSystem(channel string, payload []byte)
}

// SetBroadcaster mengaktifkan mode lintas-node. Dipanggil sekali saat startup sebelum melayani.
func (h *Hub) SetBroadcaster(b Broadcaster) { h.broadcaster = b }

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
// Selain subscriber langsung, payload juga dikirim ke subscriber pola wildcard
// (mis. "orders.*") yang prefix-nya cocok dengan channel ini.
func (h *Hub) SendToChannel(channel string, payload []byte) {
	h.mu.RLock() // RLock cukup karena fan-out hanya membaca daftar subscriber.
	clients := snapshot(h.channels[channel])
	clients = append(clients, h.matchWildcardLocked(channel)...)
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
	wasNew := h.channels[channel] == nil // channel baru pertama kali ada subscriber (occupied)
	if h.channels[channel] == nil {
		h.channels[channel] = map[string]*Client{}
	}
	h.channels[channel][c.SocketID] = c
	c.Channels[channel] = true
	isPresence := strings.HasPrefix(channel, "presence-") && member != nil
	var members []PresenceMember
	if isPresence {
		member.SocketID = c.SocketID
		if h.broadcaster == nil {
			// Single-node: simpan member di memory.
			if h.presence[channel] == nil {
				h.presence[channel] = map[string]PresenceMember{}
			}
			h.presence[channel][c.SocketID] = *member
			members = presenceSnapshot(h.presence[channel])
		}
	}
	h.mu.Unlock()
	// Webhook lifecycle: channel pertama kali terisi (per-node-local).
	if wasNew {
		h.emitLifecycle("channel_occupied", channel, nil)
	}
	// Event dikirim setelah unlock agar write ke channel client tidak terjadi saat mutex Hub dipegang.
	if isPresence {
		if h.broadcaster != nil {
			// Lintas-node: simpan ke shared state dan ambil daftar member dari semua node.
			members = h.broadcaster.JoinPresence(channel, c.SocketID, *member)
		}
		h.sendSystem(c, channel, "subscription_succeeded", map[string]any{"members": members, "count": len(members)})
		h.broadcastSystem(channel, "member_added", member)
		h.emitLifecycle("member_added", channel, member) // webhook
		return
	}
	h.sendSystem(c, channel, "subscription_succeeded", map[string]any{"channel": channel})
}

// LeaveChannel menghapus client dari channel dan membersihkan presence jika perlu.
// Dipanggil dari unsubscribe eksplisit maupun cleanup disconnect.
func (h *Hub) LeaveChannel(c *Client, channel string) {
	var removed *PresenceMember
	becameEmpty := false
	h.mu.Lock() // Write lock karena channels, c.Channels, dan presence dimutasi.
	if clients := h.channels[channel]; clients != nil {
		delete(clients, c.SocketID)
		if len(clients) == 0 {
			delete(h.channels, channel)
			becameEmpty = true // subscriber terakhir keluar (vacated)
		}
	}
	delete(c.Channels, channel)
	if h.broadcaster == nil {
		if members := h.presence[channel]; members != nil {
			if member, ok := members[c.SocketID]; ok {
				removed = &member
				delete(members, c.SocketID)
				if len(members) == 0 {
					delete(h.presence, channel)
				}
			}
		}
	}
	h.mu.Unlock()
	// Lintas-node: hapus dari shared state setelah unlock.
	if h.broadcaster != nil && strings.HasPrefix(channel, "presence-") {
		if m, ok := h.broadcaster.LeavePresence(channel, c.SocketID); ok {
			removed = &m
		}
	}
	// Broadcast leave setelah unlock untuk menghindari deadlock saat SendToChannel mengambil RLock.
	if removed != nil {
		h.broadcastSystem(channel, "member_removed", removed)
		h.emitLifecycle("member_removed", channel, removed) // webhook
	}
	// Webhook lifecycle: channel kosong (per-node-local).
	if becameEmpty {
		h.emitLifecycle("channel_vacated", channel, nil)
	}
}

// IsSubscribed memeriksa (lock-safe) apakah socket tertentu sedang subscribe ke channel.
// Dipakai untuk men-gate permintaan history agar hanya subscriber yang boleh ambil.
func (h *Hub) IsSubscribed(channel, socketID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	group := h.channels[channel]
	return group != nil && group[socketID] != nil
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

// ConnectionInfo merepresentasikan satu koneksi aktif untuk endpoint observability.
type ConnectionInfo struct {
	SocketID    string   `json:"socket_id"`
	UserID      string   `json:"user_id"`
	Role        string   `json:"role"`
	Channels    []string `json:"channels"`
	ConnectedAt int64    `json:"connected_at"` // unix milliseconds
}

// ChannelInfo merepresentasikan satu channel aktif beserta jumlah subscriber.
type ChannelInfo struct {
	Name        string `json:"name"`
	Subscribers int    `json:"subscribers"`
	Presence    bool   `json:"presence"`
}

// Stats adalah snapshot read-only state Hub untuk endpoint /stats dan /metrics.
type Stats struct {
	Connections      []ConnectionInfo `json:"connections"`
	Channels         []ChannelInfo    `json:"channels"`
	TotalConnections int              `json:"total_connections"`
	TotalChannels    int              `json:"total_channels"`
	UptimeSeconds    int64            `json:"uptime_seconds"`
}

// Snapshot mengambil potret konsisten koneksi dan channel di bawah satu RLock.
// Dipakai oleh handler /stats (dashboard data nyata) dan /metrics (Prometheus).
func (h *Hub) Snapshot() Stats {
	h.mu.RLock()
	defer h.mu.RUnlock()
	conns := make([]ConnectionInfo, 0)
	for _, group := range h.users {
		for _, c := range group {
			channels := make([]string, 0, len(c.Channels))
			for ch := range c.Channels {
				channels = append(channels, ch)
			}
			conns = append(conns, ConnectionInfo{
				SocketID: c.SocketID, UserID: c.UserID, Role: c.Role,
				Channels: channels, ConnectedAt: c.ConnectedAt.UnixMilli(),
			})
		}
	}
	channels := make([]ChannelInfo, 0, len(h.channels))
	for name, group := range h.channels {
		channels = append(channels, ChannelInfo{
			Name: name, Subscribers: len(group), Presence: strings.HasPrefix(name, "presence-"),
		})
	}
	return Stats{
		Connections: conns, Channels: channels,
		TotalConnections: len(conns), TotalChannels: len(channels),
		UptimeSeconds: int64(time.Since(h.startedAt).Seconds()),
	}
}

// matchWildcardLocked mencari subscriber channel wildcard (mis. "orders.*")
// yang prefix-nya cocok dengan channel concrete yang sedang dipublish.
// Caller wajib sudah memegang RLock/Lock karena fungsi ini membaca h.channels tanpa lock sendiri.
func (h *Hub) matchWildcardLocked(channel string) []*Client {
	var clients []*Client
	for subscribed, group := range h.channels {
		if subscribed == channel || !strings.HasSuffix(subscribed, "*") {
			continue // bukan pola wildcard, atau sudah ditangani sebagai subscriber langsung.
		}
		prefix := strings.TrimSuffix(subscribed, "*")
		if strings.HasPrefix(channel, prefix) {
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
// Jika broadcaster aktif, event dipublish lintas-node (setiap node mem-fanout lokal
// lewat Redis subscriber) agar presence konsisten antar node; jika tidak, fanout lokal.
func (h *Hub) broadcastSystem(channel, event string, data any) {
	payload, _ := json.Marshal(EventEnvelope{Type: "system", Channel: channel, Event: event, Data: data, TS: time.Now().UnixMilli()})
	if h.broadcaster != nil {
		h.broadcaster.PublishSystem(channel, payload)
		return
	}
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

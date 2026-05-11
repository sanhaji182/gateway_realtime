// Package hub berisi model koneksi WebSocket aktif dan loop I/O per client.
// File ini adalah batas antara Hub yang thread-safe dan koneksi websocket milik satu browser/tab.
package hub

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

// MessageHandler adalah callback untuk memproses pesan masuk dari browser.
// Dipanggil oleh goroutine ReadPump agar parsing protocol tetap berada di layer handler.
type MessageHandler func(*Client, []byte)

// Client merepresentasikan satu koneksi WebSocket dari satu tab/browser.
// Satu Client dimiliki oleh dua goroutine: ReadPump untuk membaca dan WritePump untuk menulis.
type Client struct {
	Hub      *Hub            // Hub pusat tempat client ini terdaftar dan melakukan fan-out.
	Conn     *websocket.Conn // Koneksi WebSocket fisik; hanya ReadPump membaca dan WritePump menulis.
	Send     chan []byte     // Queue outbound agar goroutine lain tidak menulis langsung ke Conn.
	UserID   string          // Identitas user hasil validasi JWT untuk routing notif personal.
	Role     string          // Role user dari JWT, dipakai untuk membatasi wildcard/admin channel.
	SocketID string          // Identitas unik per koneksi, dipakai pada signature private/presence channel.
	Channels map[string]bool // Daftar channel yang diikuti socket ini untuk cleanup saat disconnect.
	Log      zerolog.Logger  // Logger terstruktur yang aman dipakai lintas goroutine.
}

// NewClient membuat objek Client setelah handshake WebSocket berhasil.
// Fungsi ini belum mendaftarkan client ke Hub; caller tetap harus memanggil Register secara eksplisit.
func NewClient(h *Hub, conn *websocket.Conn, userID, role, socketID string, log zerolog.Logger) *Client {
	// Buffer 256 memberi ruang burst event pendek tanpa langsung memblokir publisher.
	return &Client{Hub: h, Conn: conn, Send: make(chan []byte, 256), UserID: userID, Role: role, SocketID: socketID, Channels: map[string]bool{}, Log: log}
}

// ReadPump menjalankan loop baca untuk satu koneksi WebSocket.
// Goroutine ini berhenti saat client disconnect, payload invalid di level transport, atau pong tidak diterima dalam 2x pingInterval.
func (c *Client) ReadPump(pingInterval time.Duration, handle MessageHandler) {
	// Cleanup dilakukan di defer agar semua jalur keluar melepas registry Hub dan koneksi network.
	defer func() { c.Hub.Unregister(c); _ = c.Conn.Close() }()
	// Deadline 2x interval memberi toleransi satu heartbeat terlewat sebelum client dianggap mati.
	_ = c.Conn.SetReadDeadline(time.Now().Add(2 * pingInterval))
	// Setiap pong memperpanjang deadline; tanpa ini koneksi idle akan ditutup oleh ReadMessage.
	c.Conn.SetPongHandler(func(string) error { return c.Conn.SetReadDeadline(time.Now().Add(2 * pingInterval)) })
	for {
		// ReadMessage blocking agar goroutine tidur sampai ada frame masuk atau deadline tercapai.
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			// Error read berarti koneksi tidak sehat; log lalu return agar defer membersihkan goroutine dan Hub.
			c.Log.Error().Err(err).Str("socket_id", c.SocketID).Msg("websocket read failed")
			return
		}
		// Handler dipanggil sinkron supaya urutan pesan dari satu socket tetap terjaga.
		handle(c, message)
	}
}

// WritePump menjalankan loop tulis untuk satu koneksi WebSocket.
// Hanya goroutine ini yang boleh menulis ke Conn agar gorilla/websocket tidak mengalami concurrent writer race.
func (c *Client) WritePump(pingInterval time.Duration) {
	// Ticker heartbeat mengirim ping berkala sesuai kontrak PING_INTERVAL.
	ticker := time.NewTicker(pingInterval)
	// Ticker harus dihentikan agar tidak leak; Close memaksa koneksi keluar jika loop berhenti karena error.
	defer func() { ticker.Stop(); _ = c.Conn.Close() }()
	for {
		select {
		case message, ok := <-c.Send:
			// Receive dari Send blocking sampai ada pesan atau channel ditutup oleh Unregister.
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second)) // 10 detik mencegah writer menggantung pada client lambat.
			if !ok {
				// Channel ditutup menandakan Hub sudah unregister; kirim close frame lalu akhiri goroutine.
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				// Write gagal berarti client tidak bisa menerima data; return agar koneksi ditutup dan tidak leak.
				c.Log.Error().Err(err).Str("socket_id", c.SocketID).Msg("websocket write failed")
				return
			}
		case <-ticker.C:
			// Receive dari ticker blocking sampai interval heartbeat tercapai.
			_ = c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second)) // Timeout pendek menjaga goroutine writer tidak tertahan lama.
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				// Ping gagal biasanya berarti koneksi putus; ReadPump juga akan berhenti saat deadline pong tercapai.
				c.Log.Error().Err(err).Str("socket_id", c.SocketID).Msg("websocket ping failed")
				return
			}
		}
	}
}

// Enqueue memasukkan payload outbound ke queue client secara non-blocking.
// Dipanggil dari banyak goroutine, sehingga tidak boleh menulis langsung ke Conn.
func (c *Client) Enqueue(payload []byte) {
	select {
	case c.Send <- payload:
		// Send berhasil tanpa blocking lama karena ada buffer; WritePump akan mengirim secara berurutan.
	default:
		// Buffer penuh menandakan client lambat; koneksi ditutup agar tidak menahan memori tanpa batas.
		c.Log.Error().Str("socket_id", c.SocketID).Msg("client send buffer full")
		_ = c.Conn.Close()
	}
}

// SendSystem mengirim event system ke client memakai envelope standar.
// Error marshal diabaikan setelah dicek karena payload system dibuat dari tipe sederhana yang stabil.
func (c *Client) SendSystem(event string, data any) {
	payload, err := json.Marshal(EventEnvelope{Type: "system", Event: event, Data: data, TS: time.Now().UnixMilli()})
	if err == nil {
		c.Enqueue(payload)
	}
}

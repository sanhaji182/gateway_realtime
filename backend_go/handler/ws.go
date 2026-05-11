// Package handler berisi HTTP handler untuk endpoint gateway.
// File ini menangani upgrade WebSocket, validasi JWT handshake, dan protocol subscribe dari browser.
package handler

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	gwAuth "go-gateway/auth"
	"go-gateway/config"
	"go-gateway/hub"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

// channelNameRe membatasi nama channel sesuai kontrak lowercase, dot notation, prefix private/presence, dan wildcard.
// Regex ini mencegah nama channel arbitrer menjadi key map yang sulit diaudit.
var channelNameRe = regexp.MustCompile(`^[a-z0-9]+([.-][a-z0-9]+)*(\.\*)?$|^(private|presence)-[a-z0-9]+([.-][a-z0-9]+)*(\.\*)?$`)

// WSHandler menyimpan dependency endpoint `/ws`.
// Setiap request sukses akan membuat satu Client dengan dua goroutine pump.
type WSHandler struct {
	Config config.Config  // Config read-only untuk JWT, origin, dan heartbeat interval.
	Hub    *hub.Hub       // Hub global tempat koneksi didaftarkan.
	Log    zerolog.Logger // Logger untuk error handshake dan protocol WebSocket.
}

// inboundMessage adalah protocol JSON dari browser ke gateway.
// Struct ini hidup per pesan yang dibaca oleh ReadPump.
type inboundMessage struct {
	Type        string          `json:"type"`         // Jenis command: subscribe, unsubscribe, atau ping.
	Channel     string          `json:"channel"`      // Nama channel versi SDK gateway.
	ChannelName string          `json:"channel_name"` // Nama channel versi auth endpoint/Pusher-like.
	Auth        string          `json:"auth"`         // Signature private/presence dari endpoint auth.
	ChannelData json.RawMessage `json:"channel_data"` // Data presence yang ikut diverifikasi dalam signature.
}

// ServeHTTP memvalidasi JWT query token lalu melakukan upgrade ke WebSocket.
// Setelah upgrade, fungsi ini mendaftarkan client dan meluncurkan ReadPump serta WritePump.
func (h WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims, err := gwAuth.ValidateToken(r.URL.Query().Get("token"), h.Config.JWTSecret)
	if err != nil {
		// Handshake ditolak sebelum upgrade agar browser menerima status HTTP 401 yang jelas.
		h.Log.Error().Err(err).Msg("websocket jwt rejected")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	upgrader := websocket.Upgrader{CheckOrigin: h.checkOrigin}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		// Upgrade gagal biasanya karena header/proxy/origin; tidak ada koneksi yang perlu dibersihkan.
		h.Log.Error().Err(err).Msg("websocket upgrade failed")
		return
	}
	socketID := newSocketID()
	client := hub.NewClient(h.Hub, conn, claims.UserID, claims.Role, socketID, h.Log)
	h.Hub.Register(client)
	client.SendSystem("connected", map[string]any{"socketId": socketID})
	// Goroutine WritePump memiliki hak tunggal untuk menulis ke Conn dan berhenti saat Send ditutup atau write gagal.
	go client.WritePump(h.Config.PingInterval)
	// Goroutine ReadPump memiliki hak tunggal untuk membaca Conn dan berhenti saat disconnect atau heartbeat timeout.
	go client.ReadPump(h.Config.PingInterval, h.handleMessage)
}

// handleMessage memproses satu pesan inbound dari ReadPump.
// Fungsi ini tidak mengambil lock Hub langsung; operasi state didelegasikan ke method Hub yang thread-safe.
func (h WSHandler) handleMessage(c *hub.Client, payload []byte) {
	var msg inboundMessage
	if err := json.Unmarshal(payload, &msg); err != nil {
		// JSON invalid adalah protocol error client; koneksi tetap hidup agar client bisa memperbaiki flow.
		h.Log.Error().Err(err).Msg("invalid websocket message")
		c.SendSystem("error", map[string]any{"code": "PROTOCOL_ERROR", "message": "Invalid JSON"})
		return
	}
	channel := msg.Channel
	if channel == "" {
		channel = msg.ChannelName
	}
	switch msg.Type {
	case "subscribe":
		h.subscribe(c, channel, msg.Auth, msg.ChannelData)
	case "unsubscribe":
		if validChannel(channel) {
			// LeaveChannel aman dipanggil meski client tidak join; Hub akan no-op jika data tidak ada.
			h.Hub.LeaveChannel(c, channel)
		}
	case "ping":
		// Ping aplikasi dibalas system heartbeat; heartbeat transport tetap ditangani oleh WebSocket ping/pong.
		c.SendSystem("heartbeat", map[string]any{"socketId": c.SocketID})
	default:
		// Command tidak dikenal dilaporkan ke client tanpa menutup koneksi agar SDK bisa recover.
		c.SendSystem("error", map[string]any{"code": "PROTOCOL_ERROR", "message": "Unknown message type"})
	}
}

// subscribe memvalidasi channel dan signature sebelum mendaftarkan client ke Hub.
// Untuk presence, channel_data di-parse menjadi PresenceMember yang disimpan per socket.
func (h WSHandler) subscribe(c *hub.Client, channel, authSig string, channelData json.RawMessage) {
	if !validChannel(channel) {
		c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "INVALID_CHANNEL"})
		return
	}
	if strings.Contains(channel, "*") && c.Role != "admin" {
		// Wildcard dapat membuka banyak resource, sehingga hanya role admin yang boleh subscribe.
		c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "FORBIDDEN"})
		return
	}
	if strings.HasPrefix(channel, "private-") || strings.HasPrefix(channel, "presence-") {
		if !verifyAuth(h.Config.JWTSecret, c.SocketID, channel, channelData, authSig) {
			// Signature gagal berarti client belum/ tidak sah melakukan auth endpoint untuk channel ini.
			c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "FORBIDDEN"})
			return
		}
	}
	var member *hub.PresenceMember
	if strings.HasPrefix(channel, "presence-") {
		var data struct {
			UserID   string         `json:"user_id"`
			UserInfo map[string]any `json:"user_info"`
		}
		if err := json.Unmarshal(channelData, &data); err != nil || data.UserID == "" {
			// Presence wajib punya user_id agar member list dan leave event bisa dipahami client.
			c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "INVALID_CHANNEL_DATA"})
			return
		}
		member = &hub.PresenceMember{UserID: data.UserID, UserInfo: data.UserInfo}
	}
	h.Hub.JoinChannel(c, channel, member)
}

// validChannel memvalidasi panjang dan pola nama channel.
// Batas 100 karakter mengikuti spec agar key map tidak tumbuh tanpa kontrol.
func validChannel(channel string) bool {
	return len(channel) > 0 && len(channel) <= 100 && channelNameRe.MatchString(channel)
}

// verifyAuth memeriksa HMAC signature private/presence dari endpoint auth.
// Presence memasukkan channel_data ke message agar metadata member tidak bisa diubah setelah signature dibuat.
func verifyAuth(secret, socketID, channel string, channelData []byte, provided string) bool {
	parts := strings.SplitN(provided, ":", 2)
	if len(parts) != 2 {
		// Format wajib app_key:signature; prefix app_key tidak dipakai untuk validasi secret.
		return false
	}
	message := socketID + ":" + channel
	if strings.HasPrefix(channel, "presence-") {
		message += ":" + string(channelData)
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	return hmac.Equal([]byte(parts[1]), []byte(hex.EncodeToString(mac.Sum(nil))))
}

// checkOrigin memvalidasi Origin WebSocket terhadap ALLOWED_ORIGINS.
// Origin kosong diizinkan untuk non-browser clients seperti CLI test atau health tooling.
func (h WSHandler) checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	for _, allowed := range h.Config.AllowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return origin == ""
}

// newSocketID membuat id acak untuk satu koneksi WebSocket.
// Jika random generator gagal, fallback tetap memberi string valid tetapi tidak ideal untuk production collision resistance.
func newSocketID() string {
	b := make([]byte, 8) // 8 byte menghasilkan 16 hex char, cukup ringkas untuk socket id ephemeral.
	if _, err := rand.Read(b); err != nil {
		return "ws_fallback"
	}
	return "ws_" + hex.EncodeToString(b)
}

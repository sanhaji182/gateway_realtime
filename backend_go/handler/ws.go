// Package handler berisi HTTP handler untuk endpoint gateway.
// File ini menangani upgrade WebSocket, validasi JWT handshake, dan protocol subscribe dari browser.
package handler

import (
	"context"
	"crypto/hmac"
	"net/http"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"strings"
	"time"

	gwAuth "go-gateway/auth"
	"go-gateway/config"
	"go-gateway/extensions"
	"go-gateway/hub"

	"github.com/gorilla/websocket"
	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

var channelNameRe = regexp.MustCompile(`^[a-z0-9]+([.-][a-z0-9]+)*(\.\*)?$|^(private|presence)-[a-z0-9]+([.-][a-z0-9]+)*(\.\*)?$`)

type WSHandler struct {
	Config      config.Config
	Hub         *hub.Hub
	Log         zerolog.Logger
	// SaaS extension points — injected by main.go, default no-op untuk self-hosted.
	EventHook   extensions.EventHook
	RateLimiter extensions.RateLimiter
	Auth        extensions.Authenticator
	// Redis opsional untuk fitur message history/replay. Jika nil, history dinonaktifkan.
	Redis       *goredis.Client
}

type inboundMessage struct {
	Type        string          `json:"type"`
	Channel     string          `json:"channel"`
	ChannelName string          `json:"channel_name"`
	Auth        string          `json:"auth"`
	ChannelData json.RawMessage `json:"channel_data"`
	Count       int             `json:"count"` // jumlah pesan history yang diminta
	Event       string          `json:"event"` // nama event untuk client event
	Data        json.RawMessage `json:"data"`  // payload client event
}

func (h WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// SaaS extension: rate-limit WebSocket connection attempts.
	if !h.RateLimiter.Allow("", "ws_connect", 10) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	// Read token from cookie first, fallback to query param (legacy).
	token := ""
	if cookie, err := r.Cookie("gateway_session"); err == nil {
		token = cookie.Value
	}
	if token == "" {
		token = r.URL.Query().Get("token")
	}
	claims, err := gwAuth.ValidateToken(token, h.Config.JWTSecret)
	if err != nil {
		h.Log.Error().Err(err).Msg("websocket jwt rejected")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	upgrader := websocket.Upgrader{CheckOrigin: h.checkOrigin}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.Log.Error().Err(err).Msg("websocket upgrade failed")
		return
	}
	socketID := newSocketID()
	client := hub.NewClient(h.Hub, conn, claims.UserID, claims.Role, socketID, h.Log)
	h.Hub.Register(client)
	client.SendSystem("connected", map[string]any{"socketId": socketID})
	h.EventHook.OnConnect("", socketID)
	go client.WritePump(h.Config.PingInterval)
	go client.ReadPump(h.Config.PingInterval, h.handleMessage)
}

func (h WSHandler) handleMessage(c *hub.Client, payload []byte) {
	var msg inboundMessage
	if err := json.Unmarshal(payload, &msg); err != nil {
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
			h.Hub.LeaveChannel(c, channel)
			h.EventHook.OnUnsubscribe("", channel, c.SocketID)
		}
	case "ping":
		c.SendSystem("heartbeat", map[string]any{"socketId": c.SocketID})
	case "history":
		h.history(c, channel, msg.Count)
	case "client_event":
		h.clientEvent(c, channel, msg.Event, msg.Data)
	default:
		c.SendSystem("error", map[string]any{"code": "PROTOCOL_ERROR", "message": "Unknown message type"})
	}
}

// clientEvent menangani event client→client (mis. indikator "sedang mengetik").
// Aturan (mirip Pusher): hanya channel private/presence, nama event harus diawali "client-",
// dan pengirim harus sudah subscribe. Event di-fanout ke semua node lewat Redis events.<channel>.
func (h WSHandler) clientEvent(c *hub.Client, channel, event string, data json.RawMessage) {
	if h.Redis == nil { // butuh Redis untuk fanout lintas node.
		return
	}
	if !validChannel(channel) || !(strings.HasPrefix(channel, "private-") || strings.HasPrefix(channel, "presence-")) {
		c.SendSystem("error", map[string]any{"code": "FORBIDDEN", "message": "Client event hanya untuk channel private/presence"})
		return
	}
	if !strings.HasPrefix(event, "client-") || len(event) > 100 {
		c.SendSystem("error", map[string]any{"code": "INVALID_EVENT", "message": "Nama client event harus diawali 'client-'"})
		return
	}
	if !h.Hub.IsSubscribed(channel, c.SocketID) {
		c.SendSystem("error", map[string]any{"code": "FORBIDDEN", "message": "Subscribe ke channel dulu sebelum mengirim client event"})
		return
	}
	if !h.RateLimiter.Allow("", "client_event", 100) {
		c.SendSystem("error", map[string]any{"code": "RATE_LIMITED", "message": "Terlalu banyak client event"})
		return
	}
	if len(data) == 0 {
		data = json.RawMessage("null")
	}
	// meta.socket_id menandai pengirim agar konsumen bisa mengabaikan event-nya sendiri bila perlu.
	envelope, _ := json.Marshal(hub.EventEnvelope{
		Type: "event", Channel: channel, Event: event, Data: data,
		TS: time.Now().UnixMilli(), Meta: map[string]any{"socket_id": c.SocketID},
	})
	h.Redis.Publish(context.Background(), "events."+channel, envelope)
	h.EventHook.OnPublish("", channel, event, int64(len(data)))
}

// history mengirim ulang (replay) beberapa pesan terakhir pada sebuah channel.
// Pesan disimpan saat publish ke Redis list "history:<channel>" (ber-cap).
// Hanya subscriber channel tersebut yang boleh meminta, demi privasi channel private/presence.
func (h WSHandler) history(c *hub.Client, channel string, count int) {
	if h.Redis == nil { // history butuh Redis; lewati bila tidak tersedia.
		return
	}
	if !validChannel(channel) || !h.Hub.IsSubscribed(channel, c.SocketID) {
		c.SendSystem("error", map[string]any{"code": "FORBIDDEN", "message": "Subscribe ke channel dulu sebelum minta history"})
		return
	}
	if count <= 0 || count > 100 { // batasi agar tidak membebani.
		count = 50
	}
	// LRANGE 0..count-1 mengambil pesan terbaru (publish memakai LPUSH).
	vals, err := h.Redis.LRange(context.Background(), "history:"+channel, 0, int64(count-1)).Result()
	if err != nil {
		c.SendSystem("error", map[string]any{"code": "HISTORY_ERROR", "message": "Gagal membaca history"})
		return
	}
	messages := make([]json.RawMessage, 0, len(vals))
	for _, v := range vals {
		messages = append(messages, json.RawMessage(v))
	}
	c.SendSystem("history", map[string]any{"channel": channel, "messages": messages})
}

func (h WSHandler) subscribe(c *hub.Client, channel, authSig string, channelData json.RawMessage) {
	// SaaS extension: rate-limit subscription per channel.
	if !h.RateLimiter.Allow("", "subscribe", 100) {
		c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "RATE_LIMITED"})
		return
	}
	if !validChannel(channel) {
		c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "INVALID_CHANNEL"})
		return
	}
	if strings.Contains(channel, "*") && c.Role != "admin" {
		c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "FORBIDDEN"})
		return
	}
	if strings.HasPrefix(channel, "private-") || strings.HasPrefix(channel, "presence-") {
		if !verifyAuth(h.Config.JWTSecret, c.SocketID, channel, channelData, authSig) {
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
			c.SendSystem("subscription_error", map[string]any{"channel": channel, "code": "INVALID_CHANNEL_DATA"})
			return
		}
		member = &hub.PresenceMember{UserID: data.UserID, UserInfo: data.UserInfo}
	}
	h.Hub.JoinChannel(c, channel, member)
	h.EventHook.OnSubscribe("", channel, c.SocketID)
}

func validChannel(channel string) bool {
	return len(channel) > 0 && len(channel) <= 100 && channelNameRe.MatchString(channel)
}

func verifyAuth(secret, socketID, channel string, channelData []byte, provided string) bool {
	parts := strings.SplitN(provided, ":", 2)
	if len(parts) != 2 {
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

func (h WSHandler) checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	for _, allowed := range h.Config.AllowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return origin == ""
}

func newSocketID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "ws_fallback"
	}
	return "ws_" + hex.EncodeToString(b)
}

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
	"go-gateway/extensions"
	"go-gateway/hub"

	"github.com/gorilla/websocket"
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
}

type inboundMessage struct {
	Type        string          `json:"type"`
	Channel     string          `json:"channel"`
	ChannelName string          `json:"channel_name"`
	Auth        string          `json:"auth"`
	ChannelData json.RawMessage `json:"channel_data"`
}

func (h WSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// SaaS extension: rate-limit WebSocket connection attempts.
	if !h.RateLimiter.Allow("", "ws_connect", 10) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	claims, err := gwAuth.ValidateToken(r.URL.Query().Get("token"), h.Config.JWTSecret)
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
	default:
		c.SendSystem("error", map[string]any{"code": "PROTOCOL_ERROR", "message": "Unknown message type"})
	}
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

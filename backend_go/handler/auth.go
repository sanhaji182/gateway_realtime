// Package handler berisi HTTP handler untuk endpoint gateway.
// File ini menangani endpoint signature channel private/presence sebelum client subscribe lewat WebSocket.
package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"

	gwAuth "go-gateway/auth"
	"go-gateway/config"
	"go-gateway/extensions"
	"go-gateway/hub"

	"github.com/rs/zerolog"
)

type AuthHandler struct {
	Config      config.Config
	Hub         *hub.Hub
	Log         zerolog.Logger
	EventHook   extensions.EventHook
	RateLimiter extensions.RateLimiter
	Auth        extensions.Authenticator
}

type authRequest struct {
	SocketID    string         `json:"socket_id"`
	ChannelName string         `json:"channel_name"`
	UserID      string         `json:"user_id"`
	AppID       string         `json:"app_id"`
	UserInfo    map[string]any `json:"user_info"`
}

func (h AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	setCORS(w, h.Config.AllowedOrigins, r.Header.Get("Origin"))
	if r.Method == http.MethodOptions {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// SaaS extension: authenticate request via injected authenticator.
	userID, tenantID, ok := h.Auth.Authenticate(r)
	if !ok {
		// Fallback to JWT validation if no SaaS authenticator.
		claims, err := gwAuth.ValidateToken(bearerToken(r), h.Config.JWTSecret)
		if err != nil {
			h.writeError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "Login required")
			h.Log.Error().Err(err).Msg("socket auth jwt rejected")
			return
		}
		tenantID = claims.UserID
		userID = claims.UserID
	}
	// Rate-limit auth endpoint per tenant.
	if !h.RateLimiter.Allow(tenantID, "auth", 100) {
		h.writeError(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests")
		return
	}
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request")
		return
	}
	if !h.Hub.HasSocket(req.SocketID) {
		h.writeError(w, http.StatusBadRequest, "INVALID_SOCKET", "Socket not found")
		return
	}
	if !validChannel(req.ChannelName) || !(strings.HasPrefix(req.ChannelName, "private-") || strings.HasPrefix(req.ChannelName, "presence-")) {
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	if strings.Contains(req.ChannelName, "*") && userID != "admin" {
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	if req.UserID != "" && req.UserID != userID {
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	appKey := req.AppID
	if appKey == "" {
		appKey = "app_key"
	}
	var channelData any
	channelDataJSON := []byte{}
	if strings.HasPrefix(req.ChannelName, "presence-") {
		channelData = map[string]any{"user_id": userID, "user_info": req.UserInfo}
		channelDataJSON, _ = json.Marshal(channelData)
	}
	message := req.SocketID + ":" + req.ChannelName
	if len(channelDataJSON) > 0 {
		message += ":" + string(channelDataJSON)
	}
	mac := hmac.New(sha256.New, []byte(h.Config.JWTSecret))
	_, _ = mac.Write([]byte(message))
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]any{"auth": appKey + ":" + hex.EncodeToString(mac.Sum(nil)), "channel_data": channelData}})
}

func bearerToken(r *http.Request) string {
	value := r.Header.Get("Authorization")
	return strings.TrimPrefix(value, "Bearer ")
}

func (h AuthHandler) writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message}})
}

func setCORS(w http.ResponseWriter, allowed []string, origin string) {
	allowOrigin := ""
	for _, candidate := range allowed {
		if candidate == "*" {
			allowOrigin = "*"
			break
		}
		if candidate == origin {
			allowOrigin = origin
		}
	}
	if allowOrigin != "" {
		w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
	}
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

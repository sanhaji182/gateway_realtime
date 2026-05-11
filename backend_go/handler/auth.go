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
	"go-gateway/hub"

	"github.com/rs/zerolog"
)

// AuthHandler menyimpan dependency untuk endpoint `/api/socket/auth`.
// Handler dipanggil oleh goroutine HTTP server dan membaca Hub untuk memvalidasi socket aktif.
type AuthHandler struct {
	Config config.Config  // Config read-only berisi JWT secret dan CORS origin.
	Hub    *hub.Hub       // Hub dipakai untuk memastikan socket_id masih aktif.
	Log    zerolog.Logger // Logger untuk audit error autentikasi.
}

// authRequest adalah body JSON yang dikirim client saat meminta signature channel.
// Struct ini hanya hidup selama satu request HTTP.
type authRequest struct {
	SocketID    string         `json:"socket_id"`    // Socket id dari event connected yang harus masih aktif di Hub.
	ChannelName string         `json:"channel_name"` // Nama private/presence channel yang akan di-subscribe.
	UserID      string         `json:"user_id"`      // User id opsional dari client; harus cocok dengan JWT jika dikirim.
	AppID       string         `json:"app_id"`       // App key publik yang menjadi prefix response auth.
	UserInfo    map[string]any `json:"user_info"`    // Metadata presence non-sensitif yang dikirim kembali sebagai channel_data.
}

// ServeHTTP memvalidasi session JWT dan menghasilkan HMAC signature untuk private/presence channel.
// Error dikembalikan sebagai JSON kontrak API, sementara detail teknis cukup dicatat di log.
func (h AuthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	setCORS(w, h.Config.AllowedOrigins, r.Header.Get("Origin"))
	if r.Method == http.MethodOptions {
		// Preflight CORS tidak butuh body dan harus selesai cepat sebelum validasi auth.
		return
	}
	if r.Method != http.MethodPost {
		// Endpoint kontrak hanya menerima POST karena body berisi data signature.
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	claims, err := gwAuth.ValidateToken(bearerToken(r), h.Config.JWTSecret)
	if err != nil {
		// JWT invalid berarti request tidak punya session valid; log detail tapi response tetap generik.
		h.writeError(w, http.StatusUnauthorized, "AUTH_REQUIRED", "Login required")
		h.Log.Error().Err(err).Msg("socket auth jwt rejected")
		return
	}
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Body invalid tidak bisa dipakai menghitung signature deterministik.
		h.writeError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid JSON request")
		return
	}
	if !h.Hub.HasSocket(req.SocketID) {
		// Socket yang tidak aktif ditolak agar signature tidak bisa dipakai ulang setelah disconnect.
		h.writeError(w, http.StatusBadRequest, "INVALID_SOCKET", "Socket not found")
		return
	}
	if !validChannel(req.ChannelName) || !(strings.HasPrefix(req.ChannelName, "private-") || strings.HasPrefix(req.ChannelName, "presence-")) {
		// Auth endpoint hanya untuk private/presence; public channel tidak membutuhkan signature.
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	if strings.Contains(req.ChannelName, "*") && claims.Role != "admin" {
		// Wildcard channel berisiko membuka banyak data, sehingga dibatasi untuk admin.
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	if req.UserID != "" && req.UserID != claims.UserID {
		// User tidak boleh meminta signature untuk identitas berbeda dari JWT.
		h.writeError(w, http.StatusForbidden, "FORBIDDEN", "Not allowed to join this channel")
		return
	}
	appKey := req.AppID
	if appKey == "" {
		// Fallback menjaga format auth tetap app_key:signature meski app_id tidak dikirim.
		appKey = "app_key"
	}
	var channelData any
	channelDataJSON := []byte{}
	if strings.HasPrefix(req.ChannelName, "presence-") {
		// channel_data dibuat server-side agar user_id presence tidak bisa dipalsukan client.
		channelData = map[string]any{"user_id": claims.UserID, "user_info": req.UserInfo}
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

// bearerToken mengambil token dari header Authorization Bearer.
// Jika header kosong atau bukan Bearer, string yang dikirim ke validator akan gagal secara aman.
func bearerToken(r *http.Request) string {
	value := r.Header.Get("Authorization")
	return strings.TrimPrefix(value, "Bearer ")
}

// writeError menulis error JSON sesuai kontrak socket auth.
// Helper ini menjaga response error konsisten antar cabang validasi.
func (h AuthHandler) writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message}})
}

// setCORS memasang header CORS berdasarkan ALLOWED_ORIGINS.
// Fungsi ini tidak melakukan wildcard credential karena gateway tidak memakai cookie auth.
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

// writeJSON menulis response JSON dengan status HTTP eksplisit.
// Error encode tidak dikembalikan karena payload berasal dari map sederhana milik server.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// Package auth menangani validasi token autentikasi yang dipakai handshake WebSocket.
// File ini sengaja tidak menyimpan session agar gateway tetap stateless dan mudah di-scale horizontal.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// Claims adalah subset claim JWT yang dibutuhkan gateway untuk routing dan authorization channel.
// Struct ini dikembalikan ke handler dan tidak dimutasi setelah validasi.
type Claims struct {
	UserID string // Identitas user untuk mapping Hub dan Redis notif.{userId}.
	Role   string // Role opsional untuk membatasi wildcard channel admin.
}

// ValidateToken memvalidasi JWT HMAC SHA-256 dan mengekstrak user id serta role.
// Mengembalikan error untuk format, signature, expiry, atau claim user yang tidak valid.
func ValidateToken(token, secret string) (Claims, error) {
	if strings.TrimSpace(secret) == "" {
		// Secret kosong membuat semua signature tidak bermakna, jadi request harus ditolak.
		return Claims{}, errors.New("jwt secret is not configured")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		// JWT harus memiliki header, payload, dan signature; format lain tidak diproses lebih lanjut.
		return Claims{}, errors.New("invalid jwt format")
	}
	signingInput := parts[0] + "." + parts[1]
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(signingInput))
	expected := mac.Sum(nil)
	actual, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil || !hmac.Equal(actual, expected) {
		// hmac.Equal dipakai agar perbandingan signature tidak bocor lewat timing attack.
		return Claims{}, errors.New("invalid jwt signature")
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		// Payload tidak bisa didecode berarti token rusak; error dibungkus untuk log internal.
		return Claims{}, fmt.Errorf("decode jwt payload: %w", err)
	}
	var payload map[string]any
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		// JSON invalid ditolak karena claim tidak dapat dipercaya.
		return Claims{}, fmt.Errorf("parse jwt payload: %w", err)
	}
	if exp, ok := payload["exp"].(float64); ok && int64(exp) < time.Now().Unix() {
		// Token expired tidak boleh membuka koneksi baru meski signature valid.
		return Claims{}, errors.New("jwt expired")
	}
	userID := firstString(payload, "user_id", "sub", "uid")
	if userID == "" {
		// Gateway membutuhkan user id untuk routing Redis ke koneksi WebSocket.
		return Claims{}, errors.New("jwt missing user id")
	}
	return Claims{UserID: userID, Role: firstString(payload, "role")}, nil
}

// firstString mengambil string pertama yang tersedia dari beberapa nama claim.
// Ini memberi kompatibilitas dengan backend yang memakai user_id, sub, atau uid.
func firstString(payload map[string]any, keys ...string) string {
	for _, key := range keys {
		if value, ok := payload[key].(string); ok && value != "" {
			return value
		}
	}
	return ""
}

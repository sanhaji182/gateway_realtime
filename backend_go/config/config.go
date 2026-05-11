// Package config memusatkan pembacaan environment variable untuk gateway.
// File ini menjaga bootstrap main tetap sederhana dan membuat default runtime terdokumentasi di kode.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config merepresentasikan konfigurasi runtime yang dipakai seluruh service.
// Struct ini dibuat sekali saat startup dan dibagikan read-only ke handler serta subscriber.
type Config struct {
	Port           string        // Port HTTP server untuk endpoint WebSocket, auth, health, SDK, dan metrics.
	RedisURL       string        // URL koneksi Redis Pub/Sub yang dibaca oleh subscriber.
	JWTSecret      string        // Secret HMAC untuk validasi JWT dan signature private/presence channel.
	AllowedOrigins []string      // Daftar origin yang boleh mengakses HTTP/WebSocket gateway.
	PingInterval   time.Duration // Interval heartbeat ping; cleanup terjadi saat pong tidak diterima 2x interval.
	LogLevel       string        // Level logging zerolog yang diparse saat startup.
}

// Load membaca semua environment variable dan menerapkan default lokal.
// Fungsi ini tidak melakukan validasi fatal; main menentukan konfigurasi mana yang wajib menghentikan service.
func Load() Config {
	pingSeconds := getenvInt("PING_INTERVAL", 30) // 30 detik adalah interval umum yang cukup ringan untuk proxy dan browser.
	return Config{
		Port:           getenv("PORT", "3000"),
		RedisURL:       getenv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:      getenv("JWT_SECRET", ""),
		AllowedOrigins: splitOrigins(getenv("ALLOWED_ORIGINS", "*")),
		PingInterval:   time.Duration(pingSeconds) * time.Second,
		LogLevel:       getenv("LOG_LEVEL", "info"),
	}
}

// getenv membaca satu env string dengan fallback ketika value kosong.
// TrimSpace mencegah konfigurasi berisi spasi dianggap valid tanpa sengaja.
func getenv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

// getenvInt membaca env integer positif dengan fallback jika parsing gagal.
// Nilai tidak valid tidak membuat service panic agar konfigurasi lokal tetap mudah dijalankan.
func getenvInt(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

// splitOrigins memecah daftar origin berbasis koma untuk CORS.
// Jika hasil kosong, wildcard dipakai agar developer lokal tidak terblokir oleh konfigurasi kosong.
func splitOrigins(value string) []string {
	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	if len(origins) == 0 {
		return []string{"*"}
	}
	return origins
}

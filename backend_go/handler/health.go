// Package handler berisi HTTP handler untuk endpoint gateway.
// File ini menyediakan health check agar load balancer dan operator bisa memantau service.
package handler

import (
	"context"
	"net/http"

	"go-gateway/hub"

	"github.com/redis/go-redis/v9"
)

// HealthHandler merepresentasikan dependency health endpoint.
// Handler dipanggil oleh goroutine HTTP server untuk setiap request `/health`.
type HealthHandler struct {
	Hub   *hub.Hub      // Hub dipakai untuk membaca jumlah koneksi aktif dan uptime.
	Redis *redis.Client // Redis diping untuk mengetahui status broker saat ini.
}

// ServeHTTP mengembalikan status service dalam format JSON sederhana.
// Redis error tidak membuat status HTTP gagal agar endpoint tetap memberi informasi diagnostik.
func (h HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	redisStatus := "ok"
	if err := h.Redis.Ping(context.Background()).Err(); err != nil {
		// Ping gagal dicerminkan di field redis agar caller tahu broker bermasalah tanpa panic.
		redisStatus = "error"
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "connections": h.Hub.Connections(), "uptime": h.Hub.Uptime().String(), "redis": redisStatus})
}

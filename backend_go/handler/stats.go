// Package handler berisi HTTP handler untuk endpoint gateway.
// File ini menyediakan endpoint observability /stats: daftar koneksi & channel aktif
// dari Hub, untuk dikonsumsi dashboard. Diproteksi JWT admin agar tidak mengekspos
// identitas user/koneksi ke publik.
package handler

import (
	"net/http"
	"strings"

	gwAuth "go-gateway/auth"
	"go-gateway/config"
	"go-gateway/hub"
)

// StatsHandler mengembalikan snapshot state Hub dalam format JSON.
// Hanya bisa diakses dengan JWT valid yang ber-role "admin".
type StatsHandler struct {
	Config config.Config
	Hub    *hub.Hub
}

func (h StatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	claims, err := gwAuth.ValidateToken(token, h.Config.JWTSecret)
	if err != nil || claims.Role != "admin" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	writeJSON(w, http.StatusOK, h.Hub.Snapshot())
}

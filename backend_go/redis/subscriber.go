// Package redis menghubungkan Redis Pub/Sub dengan Hub WebSocket.
// File ini bertugas meneruskan event dari backend publisher ke socket user yang sesuai.
package redis

import (
	"context"
	"encoding/json"
	"strings"

	"go-gateway/hub"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// Subscriber merepresentasikan worker Redis Pub/Sub yang berjalan sebagai satu goroutine aplikasi.
// Goroutine pemiliknya adalah goroutine yang memanggil Run dari main.
type Subscriber struct {
	Client *goredis.Client // Client Redis shared yang dipakai untuk PSubscribe.
	Hub    *hub.Hub        // Hub tujuan untuk mengirim payload ke user aktif.
	Log    zerolog.Logger  // Logger untuk error Redis dan payload malformed.
}

// Run menjalankan loop subscribe Redis sampai context dibatalkan atau channel Redis tertutup.
// Fungsi ini blocking, sehingga main menjalankannya dalam goroutine terpisah.
func (s Subscriber) Run(ctx context.Context) {
	// PSubscribe memakai dua pola agar kompatibel dengan spec notif.* dan PRD notif:{userId}.
	pubsub := s.Client.PSubscribe(ctx, "notif.*", "notif:*")
	defer func() {
		if err := pubsub.Close(); err != nil {
			// Close error hanya dilog karena service sedang shutdown atau subscriber berhenti.
			s.Log.Error().Err(err).Msg("redis pubsub close failed")
		}
	}()
	// Channel() mengembalikan Go channel yang menerima message Redis secara blocking.
	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			// Context dibatalkan saat graceful shutdown, jadi goroutine keluar bersih.
			return
		case msg, ok := <-ch:
			// Receive dari channel Redis blocking sampai ada publish atau pubsub ditutup.
			if !ok {
				// Channel tertutup menandakan client Redis berhenti; goroutine harus selesai agar tidak spin.
				return
			}
			userID := parseUserID(msg.Channel)
			if userID == "" {
				// Nama channel tidak sesuai kontrak; payload tidak bisa dirouting ke user tertentu.
				s.Log.Error().Str("channel", msg.Channel).Msg("invalid redis notification channel")
				continue
			}
			payload := []byte(msg.Payload)
			var envelope hub.EventEnvelope
			if err := json.Unmarshal(payload, &envelope); err != nil || envelope.Type == "" {
				// Payload malformed tetap diteruskan agar gateway tidak mengubah perilaku publisher, tetapi error dicatat.
				s.Log.Error().Err(err).Str("channel", msg.Channel).Msg("invalid redis payload")
			}
			s.Hub.SendToUser(userID, payload)
		}
	}
}

// parseUserID mengambil user id dari channel Redis notif.{userId} atau notif:{userId}.
// Return string kosong menandakan channel tidak dapat dirouting.
func parseUserID(channel string) string {
	if strings.HasPrefix(channel, "notif.") {
		return strings.TrimPrefix(channel, "notif.")
	}
	if strings.HasPrefix(channel, "notif:") {
		return strings.TrimPrefix(channel, "notif:")
	}
	return ""
}

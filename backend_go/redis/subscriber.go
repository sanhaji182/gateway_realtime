package redis

import (
	"context"
	"encoding/json"
	"strings"

	"go-gateway/hub"

	goredis "github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type Subscriber struct {
	Client *goredis.Client
	Hub    *hub.Hub
	Log    zerolog.Logger
}

func (s Subscriber) Run(ctx context.Context) {
	pubsub := s.Client.PSubscribe(ctx, "notif.*", "notif:*", "events.*")
	defer func() {
		if err := pubsub.Close(); err != nil {
			s.Log.Error().Err(err).Msg("redis pubsub close failed")
		}
	}()
	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-ch:
			if !ok { return }
			payload := []byte(msg.Payload)
			
			// Channel events.* → broadcast to WebSocket subscribers
			if strings.HasPrefix(msg.Channel, "events.") {
				var envelope hub.EventEnvelope
				if err := json.Unmarshal(payload, &envelope); err == nil && envelope.Type != "" {
					s.Hub.SendToChannel(envelope.Channel, payload)
				}
				continue
			}

			// Channel notif.* → route to specific user
			userID := parseUserID(msg.Channel)
			if userID == "" {
				s.Log.Error().Str("channel", msg.Channel).Msg("invalid redis notification channel")
				continue
			}
			s.Hub.SendToUser(userID, payload)
		}
	}
}

func parseUserID(channel string) string {
	if strings.HasPrefix(channel, "notif.") {
		return strings.TrimPrefix(channel, "notif.")
	}
	if strings.HasPrefix(channel, "notif:") {
		return strings.TrimPrefix(channel, "notif:")
	}
	return ""
}

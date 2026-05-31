// Package handler — kompatibilitas SUBSET protokol Pusher di endpoint /app/{key}.
// Mendukung: handshake pusher:connection_established, pusher:subscribe/unsubscribe/ping,
// dan envelope event kompatibel (data sebagai string JSON). Memungkinkan klien pusher-js
// terhubung tanpa banyak perubahan.
//
// CATATAN SUBSET: koneksi tidak butuh JWT (sesuai Pusher). Auth channel private/presence
// memakai JWT_SECRET gateway (bukan app secret Pusher), sehingga signer harus memakai
// JWT_SECRET. Channel publik berfungsi penuh.
package handler

import (
	"encoding/json"
	"net/http"

	"go-gateway/hub"

	"github.com/gorilla/websocket"
)

type PusherHandler struct {
	WS WSHandler
}

func (h PusherHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{CheckOrigin: h.WS.checkOrigin}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	socketID := newSocketID()
	client := hub.NewClient(h.WS.Hub, conn, "pusher_"+socketID, "", socketID, h.WS.Log)
	client.Protocol = "pusher"
	client.EnableRateLimit(h.WS.Config.MsgRate, h.WS.Config.MsgBurst)
	h.WS.Hub.Register(client)
	h.WS.EventHook.OnConnect("", socketID)
	// Handshake Pusher: data adalah STRING JSON (double-encoded).
	inner, _ := json.Marshal(map[string]any{"socket_id": socketID, "activity_timeout": 120})
	established, _ := json.Marshal(map[string]any{"event": "pusher:connection_established", "data": string(inner)})
	client.Enqueue(established)
	go client.WritePump(h.WS.Config.PingInterval)
	go client.ReadPump(h.WS.Config.PingInterval, h.handleMessage)
}

func (h PusherHandler) handleMessage(c *hub.Client, payload []byte) {
	if !c.AllowMessage() {
		return
	}
	var msg struct {
		Event string          `json:"event"`
		Data  json.RawMessage `json:"data"`
	}
	if json.Unmarshal(payload, &msg) != nil {
		return
	}
	switch msg.Event {
	case "pusher:subscribe":
		var d struct {
			Channel     string          `json:"channel"`
			Auth        string          `json:"auth"`
			ChannelData json.RawMessage `json:"channel_data"`
		}
		_ = json.Unmarshal(msg.Data, &d)
		// Reuse logika subscribe native; subscription_succeeded native akan
		// diterjemahkan WritePump menjadi pusher_internal:subscription_succeeded.
		h.WS.subscribe(c, d.Channel, d.Auth, d.ChannelData)
	case "pusher:unsubscribe":
		var d struct {
			Channel string `json:"channel"`
		}
		_ = json.Unmarshal(msg.Data, &d)
		if validChannel(d.Channel) {
			h.WS.Hub.LeaveChannel(c, d.Channel)
		}
	case "pusher:ping":
		pong, _ := json.Marshal(map[string]any{"event": "pusher:pong", "data": "{}"})
		c.Enqueue(pong)
	}
}

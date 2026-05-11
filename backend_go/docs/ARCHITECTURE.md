# Architecture

## Diagram Komponen

```text
                 ┌──────────────────────┐
                 │ Browser GatewayClient │
                 └──────────┬───────────┘
                            │ /ws?token=<jwt>
                            ▼
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│ CI4 Backend │────▶│ Redis Pub/Sub notif.* │────▶│ Go Subscriber │
└─────────────┘     └──────────────────────┘     └──────┬───────┘
                                                         ▼
                                                ┌────────────────┐
                                                │ Hub in-memory  │
                                                └──────┬─────────┘
                                                       ▼
                                                WebSocket Clients
```

## Package dan File

- `main.go`: bootstrap config, Redis, Hub, route HTTP, metrics, SDK, dan graceful shutdown 5 detik.
- `config/config.go`: loader env variable dengan default aman untuk lokal.
- `auth/jwt.go`: validasi JWT HMAC SHA-256 dan ekstraksi `user_id`/`role`.
- `hub/hub.go`: registry koneksi, channel, presence state, dan fan-out message.
- `hub/client.go`: read/write pump WebSocket, heartbeat ping, dan cleanup send channel.
- `handler/ws.go`: upgrade WebSocket, validasi JWT query token, dan protocol subscribe/unsubscribe/ping.
- `handler/auth.go`: endpoint signature private/presence channel.
- `handler/health.go`: health check koneksi, uptime, dan Redis.
- `redis/subscriber.go`: `PSubscribe notif.*` dan `notif:*`, parse userId, lalu `SendToUser`.

## Alur CI4 Publish ke Browser

1. CI4 menyelesaikan aksi bisnis, misalnya pesanan baru.
2. CI4 publish envelope JSON ke Redis channel `notif.{userId}`.
3. `redis/subscriber.go` menerima payload secara asinkron.
4. Subscriber parse `userId` dari nama channel Redis.
5. Hub mencari semua socket milik user tersebut, termasuk multi-tab.
6. Client `WritePump` mengirim payload ke browser melalui WebSocket.
7. SDK memanggil handler event berdasarkan `channel` dan `event`.

## Goroutine Lifecycle

- Satu goroutine Redis subscriber berjalan selama context aplikasi aktif.
- Setiap client memiliki satu `ReadPump` dan satu `WritePump`.
- `ReadPump` berhenti saat read error, close frame, atau heartbeat timeout.
- `WritePump` berhenti saat send channel ditutup atau write/ping gagal.
- Shutdown server membatalkan context subscriber dan memberi waktu cleanup 5 detik.

## Thread Safety

Hub memakai `sync.RWMutex` untuk melindungi map `users`, `channels`, dan `presence`. Operasi read seperti `Connections` dan fan-out snapshot memakai read lock. Operasi mutasi seperti register, unregister, join, dan leave memakai write lock. Pengiriman WebSocket dilakukan setelah snapshot agar lock tidak tertahan oleh client lambat.

# Code Guide

Panduan ini menjelaskan file utama untuk developer baru.

## `main.go`

Menjalankan aplikasi: load config, setup zerolog, konek Redis, membuat Hub, memasang route, menjalankan subscriber, dan graceful shutdown. File ini sengaja tipis agar lifecycle service terlihat jelas. Jika menambah route, tambahkan di `main.go` dan jaga agar handler tetap berada di package `handler`.

## `config/config.go`

Membaca `PORT`, `REDIS_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `PING_INTERVAL`, dan `LOG_LEVEL`. Default disediakan untuk lokal, kecuali `JWT_SECRET` yang wajib diisi. Jika menambah env baru, beri default eksplisit dan dokumentasikan di `docs/CONFIGURATION.md`.

## `auth/jwt.go`

Memvalidasi JWT HMAC SHA-256 tanpa menyimpan session server-side. Fungsi utama `ValidateToken` mengembalikan `Claims` berisi `UserID` dan `Role`. Modifikasi file ini hanya jika format claim JWT backend berubah.

## `hub/hub.go`

Berisi `Hub`, `PresenceMember`, dan `EventEnvelope`. Hub menyimpan map `userId -> socket`, `channel -> socket`, dan `presence -> member`. Design decision utama: fan-out memakai snapshot agar mutex tidak ditahan saat write WebSocket.

## `hub/client.go`

Berisi `Client`, `ReadPump`, `WritePump`, dan queue `Send`. `WritePump` mengirim heartbeat ping setiap `PING_INTERVAL`; `ReadPump` memperpanjang deadline saat menerima pong. Jangan menulis langsung ke `Conn` dari goroutine lain; gunakan `Enqueue`.

## `handler/ws.go`

Meng-upgrade HTTP ke WebSocket, memvalidasi JWT dari `?token=`, membuat socket id, lalu menangani message `subscribe`, `unsubscribe`, dan `ping`. Private/presence subscription harus membawa signature dari `/api/socket/auth`.

## `handler/auth.go`

Menghasilkan HMAC signature untuk private dan presence channel. Endpoint memvalidasi JWT bearer, socket masih aktif, channel valid, dan user id cocok. Presence response mengembalikan `channel_data` canonical dari server.

## `handler/health.go`

Mengembalikan health sederhana: status, jumlah koneksi, uptime, dan hasil ping Redis. File ini aman diperluas untuk readiness/liveness terpisah jika deployment membutuhkan.

## `redis/subscriber.go`

Menjalankan `PSubscribe` ke `notif.*` dan `notif:*`. Payload diteruskan apa adanya ke semua koneksi user target. Validasi envelope hanya dipakai untuk logging error agar event malformed tidak membuat service panic.

## `Dockerfile`

Multi-stage build: stage Go untuk compile binary statis, stage Alpine sebagai final image kecil. Runtime berjalan sebagai user non-root `gateway`.

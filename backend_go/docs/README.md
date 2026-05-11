# Go Gateway Realtime WebSocket Service

Go Gateway adalah layanan WebSocket self-hosted untuk notifikasi realtime seperti Pusher, tetapi berjalan di infrastruktur sendiri. Service ini menerima koneksi browser, memvalidasi JWT, mengelola channel public/private/presence, lalu meneruskan event dari Redis Pub/Sub ke client yang tepat.

## Untuk Apa

Gateway dipakai agar aplikasi marketplace UMKM bisa mengirim chat, update pesanan, update dokumen, dan broadcast sistem tanpa menunggu refresh halaman. Backend CodeIgniter 4 tetap menangani business logic dan menyimpan history notifikasi, sementara Go Gateway fokus pada koneksi realtime.

## Arsitektur Sistem

```text
Browser SDK
   │ WebSocket /ws?token=
   ▼
Go Gateway ───── /api/socket/auth
   │
   │ subscribe notif.*
   ▼
Redis Pub/Sub
   ▲
   │ publish notif.{userId}
CodeIgniter 4 Backend
```

## Alur Data End-to-End

1. User login di aplikasi dan browser menerima JWT dari backend.
2. Browser membuka WebSocket ke `/ws?token=<jwt>`.
3. Gateway memvalidasi JWT dan mendaftarkan socket ke Hub berdasarkan `userId`.
4. Untuk private/presence channel, browser meminta signature ke `/api/socket/auth`.
5. Backend/CI4 memproses aksi bisnis lalu publish JSON event ke Redis channel `notif.{userId}` atau `notif:{userId}`.
6. Redis subscriber di Gateway menerima payload dan mencari semua socket user tersebut.
7. Gateway mengirim envelope event ke semua tab aktif milik user.

## Stack dan Alasan

- Go: goroutine ringan dan binary tunggal untuk ribuan koneksi WebSocket.
- gorilla/websocket: implementasi WebSocket stabil dan eksplisit.
- Redis Pub/Sub: decoupling antara CI4 publisher dan Go subscriber.
- zerolog: logging terstruktur, cepat, dan cocok untuk production.
- JWT HMAC SHA-256: handshake sederhana yang bisa diverifikasi tanpa state server.

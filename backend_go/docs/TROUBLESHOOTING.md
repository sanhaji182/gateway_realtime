# Troubleshooting

## WebSocket Tidak Connect

Penyebab umum: URL salah, proxy tidak meneruskan header upgrade, origin ditolak, atau JWT kosong. Solusi: cek browser console, pastikan endpoint `/ws?token=<jwt>`, verifikasi Nginx memiliki `Upgrade` dan `Connection`, lalu cocokkan `ALLOWED_ORIGINS`.

## JWT Rejected

Penyebab umum: `JWT_SECRET` berbeda dengan backend, token expired, format bukan HMAC SHA-256, atau claim user id tidak ada. Solusi: samakan secret, cek `exp`, dan pastikan payload punya `user_id`, `sub`, atau `uid`.

## Redis Tidak Connect

Penyebab umum: `REDIS_URL` salah, Redis belum jalan, DNS Docker service salah, atau network antar container terpisah. Solusi: jalankan `redis-cli -u "$REDIS_URL" PING`, cek Docker Compose network, dan lihat log `redis ping failed`.

## Memory Naik

Penyebab umum: client tidak pong, proxy timeout terlalu panjang, atau publisher mengirim payload besar terus-menerus. Solusi: pastikan heartbeat aktif, `proxy_read_timeout` lebih besar dari `PING_INTERVAL`, batasi payload event maksimal 10KB, dan pantau `gateway_connections`.

## Notif Tidak Muncul

Debug langkah demi langkah: pastikan browser sudah menerima event `connected`, cek `socketId`, publish manual ke `notif.{userId}`, cek Redis dengan `redis-cli MONITOR`, lalu pastikan payload JSON berisi envelope `type`, `channel`, `event`, `data`, dan `ts`.

## CORS Error

Penyebab umum: origin browser tidak ada di `ALLOWED_ORIGINS` atau menggunakan wildcard saat credential dikirim. Solusi: set `ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com` dan restart service.

## Debug Realtime dengan Redis MONITOR

```bash
redis-cli MONITOR
```

Di terminal lain:

```bash
redis-cli PUBLISH notif.u-881 '{"type":"event","channel":"system.broadcast","event":"sistem.broadcast","data":{"judul":"Tes","isi":"Halo"},"ts":1746432001842}'
```

Jika command publish terlihat di `MONITOR` tetapi browser tidak menerima event, fokus debug pada JWT user id, registry koneksi Hub, dan log Gateway.

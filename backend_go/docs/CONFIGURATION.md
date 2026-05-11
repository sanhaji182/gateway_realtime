# Configuration

Semua konfigurasi dibaca dari environment variable.

| Variable | Default | Wajib | Penjelasan |
|---|---:|---|---|
| `PORT` | `3000` | Tidak | Port HTTP server untuk `/ws`, `/health`, auth, SDK, dan metrics. |
| `REDIS_URL` | `redis://localhost:6379/0` | Tidak | URL Redis Pub/Sub yang dipakai subscriber. |
| `JWT_SECRET` | kosong | Ya | Secret HMAC untuk validasi JWT dan signature private/presence channel. |
| `ALLOWED_ORIGINS` | `*` | Tidak | Daftar origin CORS dipisahkan koma. Gunakan origin spesifik di production. |
| `PING_INTERVAL` | `30` | Tidak | Interval heartbeat ping dalam detik. Client dibersihkan jika tidak pong dalam `2x` nilai ini. |
| `LOG_LEVEL` | `info` | Tidak | Level zerolog: `trace`, `debug`, `info`, `warn`, `error`. |

## Contoh `.env` Lengkap

```bash
PORT=3000
REDIS_URL=redis://redis:6379/0
JWT_SECRET=prod-hmac-secret-minimum-32-characters
ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com
PING_INTERVAL=30
LOG_LEVEL=info
```

## Catatan Production

- Jangan memakai `ALLOWED_ORIGINS=*` di production public.
- `JWT_SECRET` harus sama dengan issuer JWT aplikasi backend.
- Rotasi `JWT_SECRET` harus dikoordinasikan dengan aplikasi yang menerbitkan token.

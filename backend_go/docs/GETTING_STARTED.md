# Getting Started

## Prerequisites

- Go 1.22 atau lebih baru.
- Redis 7.x berjalan lokal atau remote.
- JWT HMAC secret yang sama dengan aplikasi backend.
- `redis-cli` untuk pengujian publish manual.

## Clone dan Install Dependencies

```bash
git clone https://example.com/umkm/go-gateway.git
cd go-gateway
go mod tidy
```

## Setup `.env`

```bash
export PORT=3000
export REDIS_URL=redis://localhost:6379/0
export JWT_SECRET=local-dev-secret-minimum-32-characters
export ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3000
export PING_INTERVAL=30
export LOG_LEVEL=info
```

## Run Lokal

```bash
go build -o gateway-server .
./gateway-server
```

Server akan listen di `:3000` jika `PORT` tidak diubah.

## Verifikasi Health Check

```bash
curl http://localhost:3000/health
```

Contoh response:

```json
{"status":"ok","connections":0,"uptime":"10s","redis":"ok"}
```

## Test Publish Event Manual

Setelah browser connect dengan JWT valid, publish event ke user target:

```bash
redis-cli PUBLISH notif.u-881 '{"type":"event","channel":"orders.99","event":"pesanan.baru","data":{"order_id":99,"total":150000,"item_count":2},"ts":1746432001842}'
```

Gateway juga menerima channel Redis format `notif:u-881` untuk kompatibilitas dengan PRD.

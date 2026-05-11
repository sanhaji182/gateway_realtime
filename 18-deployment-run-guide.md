# Deployment & Run Guide

## 1. Setup Redis (Message Broker)
Gunakan Docker untuk menjalankan Redis dengan persistensi.
```bash
docker run -d --name redis-gateway   -p 6379:6379   --restart unless-stopped   redis:7-alpine redis-server --appendonly yes
```

## 2. Backend: Go Gateway
### Build
```bash
# Di folder backend/go-gateway
go build -o gateway-server .
```

### Run
```bash
export PORT=3000
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=your-secret-key
export ALLOWED_ORIGINS=https://dashboard.internal,https://app.internal
./gateway-server
```

## 3. Backend: CI4 Library
### Implementasi Lib
Buat file `app/Libraries/Notifikasi.php` menggunakan `predis/predis`.
```php
namespace App\Libraries;
use Predis\Client;

class Notifikasi {
    protected $redis;
    public function __construct() {
        $this->redis = new Client(env('REDIS_URL'));
    }
    public function publish($userId, $type, $payload) {
        $this->redis->publish("notif.$userId", json_encode([
            'tipe' => $type,
            'payload' => $payload,
            'timestamp' => round(microtime(true) * 1000)
        ]));
    }
}
```

## 4. Frontend: Dashboard
### Install & Build
```bash
# Di folder dashboard
npm install
npm run build
```

### Run
```bash
export NEXT_PUBLIC_API_URL=https://gateway.internal/api/v1
export NEXT_PUBLIC_WS_URL=wss://gateway.internal
npm run start
```

## 5. Nginx Reverse Proxy (Production)
Wajib ada untuk WebSocket. Buat file `/etc/nginx/sites-available/gateway`:
```nginx
server {
    server_name gateway.internal;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }
}
```

## 6. Deployment Workflow (All-in-one)
1. **Redis**: Jalankan container.
2. **Go Server**: Jalankan sebagai systemd service atau container.
3. **Frontend**: Jalankan via PM2 atau Docker.
4. **Proxy**: Nginx harus berjalan sebelum traffic masuk.

## Tips Monitoring
- **Grafana**: Tambahkan datasource Prometheus yang mengarah ke `GET /metrics` di Go server.
- **Log**: Gunakan `docker logs -f gateway-server` untuk debugging awal.

# Deployment

## Docker Compose

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  gateway:
    build: .
    environment:
      PORT: "3000"
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET: prod-hmac-secret-minimum-32-characters
      ALLOWED_ORIGINS: https://app.example.com
      PING_INTERVAL: "30"
      LOG_LEVEL: info
    ports:
      - "3000:3000"
    depends_on:
      - redis
```

Jalankan:

```bash
docker compose up -d --build
```

## Nginx WebSocket Proxy

```nginx
server {
  server_name gateway.example.com;

  location /ws {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 75s;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## SSL via Certbot

```bash
sudo certbot --nginx -d gateway.example.com
sudo systemctl reload nginx
```

## Systemd Alternatif Docker

```ini
[Unit]
Description=Go Gateway WebSocket Service
After=network.target redis.service

[Service]
User=gateway
WorkingDirectory=/opt/go-gateway
Environment=PORT=3000
Environment=REDIS_URL=redis://127.0.0.1:6379/0
Environment=JWT_SECRET=prod-hmac-secret-minimum-32-characters
Environment=ALLOWED_ORIGINS=https://app.example.com
Environment=PING_INTERVAL=30
Environment=LOG_LEVEL=info
ExecStart=/opt/go-gateway/gateway-server
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## Monitoring

- Log: baca stdout Docker atau `journalctl -u go-gateway -f` untuk systemd.
- Health check: `curl http://127.0.0.1:3000/health`.
- Prometheus: scrape `GET /metrics` untuk `gateway_connections`.
- Redis: monitor latency dan connected clients dari Redis exporter atau `redis-cli INFO`.

# API Reference

## `GET /health`

- Auth: tidak ada.
- Request: tidak ada body.
- Response: status service, jumlah koneksi, uptime, dan status Redis.

```bash
curl http://localhost:3000/health
```

```json
{"status":"ok","connections":0,"uptime":"1m0s","redis":"ok"}
```

## `GET /ws?token=`

- Auth: JWT HMAC SHA-256 pada query parameter `token`.
- Request: WebSocket upgrade request.
- Response awal WebSocket:

```json
{"type":"system","event":"connected","data":{"socketId":"ws_abcd"}}
```

Contoh browser:

```js
const ws = new WebSocket('ws://localhost:3000/ws?token=' + encodeURIComponent(jwt))
```

## `POST /api/socket/auth`

- Auth: `Authorization: Bearer <jwt>`.
- Request: JSON berisi `socket_id`, `channel_name`, `user_id`, `app_id`, dan opsional `user_info`.
- Response: HMAC signature `app_key:signature_hex` dan `channel_data` untuk presence.

```bash
curl -X POST http://localhost:3000/api/socket/auth \
  -H 'Authorization: Bearer <jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"socket_id":"ws_a1b2c3","channel_name":"presence-room.1","user_id":"u-881","app_id":"app_a1b2c","user_info":{"name":"San Haji","role":"admin"}}'
```

```json
{"data":{"auth":"app_a1b2c:signature_hex","channel_data":{"user_id":"u-881","user_info":{"name":"San Haji","role":"admin"}}}}
```

Error response:

```json
{"error":{"code":"FORBIDDEN","message":"Not allowed to join this channel"}}
```

## `GET /sdk/gateway.js`

- Auth: tidak ada.
- Request: tidak ada body.
- Response: JavaScript SDK `GatewayClient`.

```bash
curl http://localhost:3000/sdk/gateway.js
```

Browser usage:

```html
<script src="http://localhost:3000/sdk/gateway.js"></script>
```

## `GET /metrics`

- Auth: tidak ada.
- Request: tidak ada body.
- Response: Prometheus text format.

```bash
curl http://localhost:3000/metrics
```

```text
gateway_connections 3
```

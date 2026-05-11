# 15 – Socket SDK Spec

## Goal
Mendefinisikan kontrak SDK JavaScript yang dipakai aplikasi frontend untuk subscribe event realtime.

## SDK Name
`GatewayClient`

## Init
```js
const gw = new GatewayClient({
  key: 'pk_live_...',
  host: 'wss://gateway.internal',
  authEndpoint: '/api/socket/auth',
  autoReconnect: true,
  pingInterval: 30000,
})
```

---

## Core API

### connect()
Menghubungkan websocket.

### disconnect()
Menutup koneksi websocket secara manual.

### subscribe(channelName, options?)
Return channel instance.

```js
const ch = gw.subscribe('orders.99')
```

### unsubscribe(channelName)
Keluar dari channel.

### bind(eventName, handler)
Bind handler global pada client atau channel.

### unbind(eventName, handler)
Hapus handler spesifik.

### on(eventName, handler)
Listener untuk event connection lifecycle.

### off(eventName, handler)
Remove listener.

### socketId
Getter untuk socket id aktif.

---

## Client Events

| Event | Payload |
|------|---------|
| `connected` | `{ socketId }` |
| `disconnected` | `{ reason }` |
| `reconnecting` | `{ attempt, delayMs }` |
| `reconnected` | `{ socketId }` |
| `error` | `{ code, message }` |
| `state_change` | `{ from, to }` |

### Example
```js
gw.on('connected', ({ socketId }) => console.log('connected', socketId))
gw.on('reconnecting', ({ attempt }) => console.log('retry', attempt))
```

---

## Channel Instance API

```js
const ch = gw.subscribe('private-orders.99')

ch.on('order.paid', (data) => {})
ch.on('*', (eventName, data) => {})
ch.off('order.paid')
ch.unsubscribe()
```

### Presence Methods
```js
const room = gw.subscribe('presence-room.1')
room.on('member_joined', (member) => {})
room.on('member_left', (member) => {})
room.members() // array
room.count()   // number
```

---

## Reconnect Behavior
- Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s max.
- Setelah reconnect sukses, client harus otomatis re-subscribe ke semua channel aktif.
- Bila auth channel gagal setelah reconnect, channel itu ditandai error dan tidak ikut auto-resubscribe sampai refresh.

---

## Message Envelope
Gateway ke client mengirim envelope standar:
```json
{
  "type": "event",
  "channel": "orders.99",
  "event": "order.paid",
  "data": { "order_id": 99 },
  "ts": 1746432001842
}
```

System events:
```json
{ "type": "system", "event": "connected", "data": { "socketId": "ws_1" } }
```

---

## Error Handling
- Emit `error` event untuk auth failure, protocol error, server unavailable.
- Jangan throw uncaught error dari SDK ke aplikasi host.
- Semua async error harus lewat callback/event.

---

## Browser Compatibility
- Chrome, Edge, Firefox, Safari modern.
- Tidak target IE.
- Fallback polling tidak wajib di SDK V1, hanya reconnect WebSocket.

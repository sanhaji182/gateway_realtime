# 11 – Docs Content

File MDX disimpan di `content/docs/`.

---

## content/docs/introduction.mdx

```mdx
# Introduction

**Internal Event Gateway** adalah self-hosted realtime event system untuk aplikasi internal.
Mirip Pusher, tapi berjalan di infrastruktur kamu sendiri.

## Cara kerja

1. Backend kamu (CI4 / Golang / Node.js) publish event via REST API atau PHP SDK.
2. Gateway meneruskan event ke semua subscriber yang terhubung via WebSocket.
3. Frontend kamu (browser / mobile) menerima event secara realtime tanpa polling.

## Kapan pakai ini

- Notifikasi order baru ke penjual secara realtime.
- Update status pesanan tanpa refresh halaman.
- Indikator "sedang mengetik" pada fitur chat.
- Broadcast pengumuman dari admin.
```

---

## content/docs/quick-start.mdx

```mdx
# Quick Start

Panduan ini akan membuat kamu mengirim event pertama dalam < 5 menit.

## 1. Buat App

Login ke dashboard → **Apps** → **New App**.
Catat `App ID`, `Key`, dan `Secret`.

## 2. Publish event (PHP / CI4)

Install library:
```bash
composer require your-org/gateway-php-sdk
```

Publish event:
```php
use Gateway\Client;

$client = new Client(
    appId: 'app_a1b2c',
    key:   'pk_live_...',
    secret:'sk_live_...',
    host:  'https://gateway.internal'
);

$client->publish(
    channel: 'orders.99',
    event:   'order.paid',
    data:    ['order_id' => 99, 'amount' => 150000]
);
```

## 3. Subscribe di frontend (JavaScript)

```html
<script src="https://gateway.internal/sdk/gateway.js"></script>
<script>
const gw = new GatewayClient({
  key:  'pk_live_...',
  host: 'wss://gateway.internal'
})

const channel = gw.subscribe('orders.99')

channel.on('order.paid', (data) => {
  console.log('Order paid:', data)
  showNotification(`Order #${data.order_id} sudah dibayar`)
})
</script>
```

## 4. Verifikasi

Buka dashboard → **Events**. Event `order.paid` harus muncul di tabel.
```

---

## content/docs/authentication.mdx

```mdx
# Authentication

## App Key & Secret

Setiap app punya dua credential:

| Credential | Visibilitas | Dipakai untuk          |
|------------|-------------|------------------------|
| App Key    | Public      | Subscribe (frontend)   |
| App Secret | Private     | Publish (backend only) |

<Callout type="warning">
  App Secret **tidak boleh** di-expose di frontend code atau git repository.
  Gunakan environment variable.
</Callout>

## WebSocket Auth

Saat koneksi dibuat, gateway memvalidasi App Key:

```
wss://gateway.internal/app/pk_live_a1b2c?version=1
```

Untuk private channel, kirim auth token saat subscribe:

```js
const channel = gw.subscribe('private-orders.99', {
  auth: async () => {
    const res = await fetch('/api/gateway-auth', {
      method: 'POST',
      body: JSON.stringify({ socket_id: gw.socketId, channel: 'private-orders.99' })
    })
    return res.json() // { auth: "pk_live_...:sha256signature" }
  }
})
```

## Rotate Secret

Bila secret bocor: Dashboard → Apps → [nama app] → **Rotate Secret**.
Semua koneksi yang menggunakan secret lama akan ditolak saat reconnect.
```

---

## content/docs/publishing-events.mdx

```mdx
# Publishing Events

## Via REST API

```bash
POST /api/v1/events/publish
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "app_id":  "app_a1b2c",
  "channel": "orders.99",
  "event":   "order.paid",
  "data":    { "order_id": 99, "amount": 150000 }
}
```

Response:
```json
{ "data": { "ok": true, "event_id": "evt_001", "subscribers": 3 } }
```

## Via PHP SDK (CI4)

```php
// Di CI4 Controller atau Service
$notif = new \Gateway\Client(appId: env('GW_APP_ID'), ...);

// Di OrderController setelah payment confirmed
$notif->publish('orders.' . $order->id, 'order.paid', [
    'order_id' => $order->id,
    'buyer_id' => $order->buyer_id,
    'amount'   => $order->total,
]);
```

## Channel Naming

| Pattern     | Contoh           | Keterangan               |
|-------------|------------------|--------------------------|
| `name`      | `users`          | Public channel global    |
| `name.id`   | `orders.99`      | Channel per entity       |
| `private-*` | `private-inbox.5`| Perlu auth saat subscribe|
| `presence-*`| `presence-room.1`| Expose online member list|

## Wildcard Subscribe

```js
// Subscribe semua event di orders.*
gw.subscribe('orders.*').on('*', handler)
```
```

---

## content/docs/javascript-sdk.mdx

```mdx
# JavaScript SDK

## Install

```html
<!-- Via CDN -->
<script src="https://gateway.internal/sdk/gateway.js"></script>

<!-- Via npm -->
npm install @internal/gateway-js
```

## Connect

```js
const gw = new GatewayClient({
  key:  'pk_live_...',
  host: 'wss://gateway.internal',
  // opsional:
  authEndpoint: '/api/gateway-auth',
  autoReconnect: true,
})
```

## Subscribe & Listen

```js
// Public channel
const ch = gw.subscribe('orders.99')
ch.on('order.paid',    (data) => { /* ... */ })
ch.on('order.shipped', (data) => { /* ... */ })

// Unsubscribe
gw.unsubscribe('orders.99')
```

## Connection Events

```js
gw.on('connected',     ()    => console.log('WS connected'))
gw.on('disconnected',  ()    => console.log('WS disconnected'))
gw.on('reconnecting',  (n)   => console.log(`Reconnect attempt ${n}`))
gw.on('error',         (err) => console.error(err))
```

## Reconnect Behavior
Auto-reconnect dengan exponential backoff: 1s → 2s → 4s → 8s → max 30s.
```

---

## content/docs/webhooks.mdx

```mdx
# Webhooks

## Overview

Webhook memungkinkan gateway mengirimkan HTTP request ke endpoint backend kamu setiap kali event tertentu dipublish.

Berguna untuk: logging, trigger background job, notifikasi antar service.

## Konfigurasi

Dashboard → Apps → [nama app] → **Webhook Endpoints** → tambah endpoint.

Field:
- **URL**: endpoint yang akan di-POST.
- **Events**: filter event (`*` untuk semua, atau spesifik seperti `order.paid`).
- **Secret**: opsional, untuk verifikasi signature.

## Payload

```json
POST https://api.internal/hook
Content-Type: application/json
X-Gateway-Signature: sha256=abc123...
X-Gateway-Timestamp: 1746432001

{
  "event":   "order.paid",
  "channel": "orders.99",
  "app_id":  "app_a1b2c",
  "data":    { "order_id": 99 },
  "ts":      1746432001842
}
```

## Verifikasi Signature

```php
$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'];
$secret    = env('GW_WEBHOOK_SECRET');

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit;
}
```

## Retry Policy

| Attempt | Delay   |
|---------|---------|
| 1       | Segera  |
| 2       | 30 detik|
| 3       | 5 menit |
| 4       | 30 menit|
| 5       | 2 jam   |

Setelah 5 kali gagal, delivery dianggap dead. Manual retry tersedia di dashboard.

Endpoint harus merespons dengan HTTP 2xx dalam 10 detik.
```

---

## content/docs/api-reference.mdx

```mdx
# API Reference

Base URL: `https://gateway.internal/api/v1`

Auth: semua endpoint memerlukan header `Authorization: Bearer <secret>`.

## Publish Event

```
POST /events/publish
```

<APIParam name="app_id"  type="string"  required>ID aplikasi.</APIParam>
<APIParam name="channel" type="string"  required>Nama channel target.</APIParam>
<APIParam name="event"   type="string"  required>Nama event (dot-notation).</APIParam>
<APIParam name="data"    type="object"  required>Payload bebas, max 10KB.</APIParam>

## List Apps

```
GET /apps
```

Query params: `status`, `page`, `per_page`.

## Get App Detail

```
GET /apps/:id
```

Lihat dokumentasi Apps lengkap di file `07-api-spec.md` untuk semua endpoint dan response shape.
```

# 13 – Socket Channel Spec

## Goal
Mendefinisikan kontrak channel seperti Pusher: public, private, presence, wildcard, dan naming convention.

## Channel Types

### 1) Public Channel
- Bisa di-subscribe tanpa auth tambahan.
- Contoh: `orders.99`, `chat.55`, `system.broadcast`.
- Dipakai untuk event yang tidak sensitif atau sudah disaring oleh backend.

### 2) Private Channel
- Wajib auth saat subscribe.
- Prefix: `private-`.
- Contoh: `private-orders.99`, `private-chat.55`.
- Hanya user yang berhak bisa join.

### 3) Presence Channel
- Wajib auth saat subscribe.
- Prefix: `presence-`.
- Contoh: `presence-room.1`, `presence-chat.55`.
- Menyediakan member list dan member count.

### 4) Wildcard Channel
- Mendukung pattern subscribe untuk dashboard admin / debugging.
- Contoh: `orders.*`, `chat.*`, `presence-room.*`.
- Wildcard subscription hanya untuk user role admin atau viewer tertentu.

---

## Naming Convention

| Pattern | Contoh | Keterangan |
|---------|--------|-----------|
| `name` | `users` | public/global |
| `name.id` | `orders.99` | entity-specific |
| `private-name.id` | `private-orders.99` | butuh auth |
| `presence-name.id` | `presence-room.1` | butuh auth + presence member |
| `name.*` | `orders.*` | wildcard admin |

### Rules
- Lowercase saja.
- Dot notation untuk hierarchy.
- Hyphen hanya untuk prefix `private-` dan `presence-`.
- Tidak ada spasi.
- Maksimum 100 karakter.
- Channel name harus deterministik dari domain model, jangan random.

---

## Subscription Rules

### Public
```js
gw.subscribe('orders.99')
```

### Private
```js
gw.subscribe('private-orders.99', {
  auth: () => fetch('/api/socket/auth', { method: 'POST', body: JSON.stringify({ channel: 'private-orders.99' }) })
})
```

### Presence
```js
gw.subscribe('presence-room.1', {
  auth: () => fetch('/api/socket/auth', { method: 'POST', body: JSON.stringify({ channel: 'presence-room.1' }) })
})
```

### Wildcard
```js
gw.subscribe('orders.*')
```

Wildcard hanya boleh untuk dashboard internal, bukan untuk client end-user biasa.

---

## Backend Mapping

| Domain Event | Channel |
|-------------|---------|
| Order paid | `orders.{order_id}` atau `private-orders.{order_id}` |
| Chat message | `chat.{room_id}` atau `private-chat.{room_id}` |
| Online status | `presence-chat.{room_id}` |
| System broadcast | `system.broadcast` |
| Admin audit | `admin.*` |

---

## Subscribe Flow
1. Client request subscribe ke channel.
2. Jika public: langsung join.
3. Jika private/presence: client meminta auth token dari backend.
4. Backend memverifikasi user, app, role, dan channel permission.
5. Gateway menerima auth signature, lalu join channel.
6. Jika presence: server menambah user ke member list dan broadcast join event.

---

## Unsubscribe Flow
- Client leave channel saat page berubah atau socket disconnect.
- Presence channel harus mengurangi member count dan broadcast leave event.
- Saat socket reconnect, client harus re-subscribe otomatis ke semua channel aktif sebelumnya.

---

## Implementation Notes
- Simpan daftar channel per socket di memory.
- Simpan daftar member per presence room di memory.
- Jangan simpan presence state di DB pada V1.
- Admin wildcard hanya untuk UI dashboard dan observability.

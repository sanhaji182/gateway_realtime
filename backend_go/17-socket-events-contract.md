# 17 – Socket Events Contract

## Purpose
Menyeragamkan format event dari backend ke client agar SDK dan UI konsisten.

## Envelope
```json
{
  "type": "event",
  "channel": "orders.99",
  "event": "order.paid",
  "data": { "order_id": 99, "amount": 150000 },
  "ts": 1746432001842,
  "meta": {
    "source": "ci4-api",
    "request_id": "req_aa1"
  }
}
```

### Required Fields
- `type`
- `channel`
- `event`
- `data`
- `ts`

### Optional Fields
- `meta.source`
- `meta.request_id`
- `meta.trace_id`

---

## System Events

| Event | Purpose |
|------|---------|
| `connected` | socket connected |
| `disconnected` | socket disconnected |
| `reconnecting` | retry in progress |
| `reconnected` | reconnect sukses |
| `heartbeat` | ping/pong check |
| `subscription_succeeded` | channel join berhasil |
| `subscription_error` | auth atau protocol error |
| `member_added` | presence join |
| `member_removed` | presence leave |

System events dikirim lewat channel internal SDK, bukan sebagai business event.

---

## Business Events

| Event | Contoh Channel | Data Minimal |
|------|---------------|--------------|
| `chat.pesanbaru` | `chat.55` | `room_id`, `sender_name`, `preview` |
| `chat.sedangmengetik` | `chat.55` | `room_id`, `sender_id` |
| `pesanan.baru` | `orders.99` | `order_id`, `total`, `item_count` |
| `pesanan.statusberubah` | `orders.99` | `order_id`, `status_lama`, `status_baru` |
| `pesanan.pembayaranditerima` | `orders.99` | `order_id`, `amount`, `metode_bayar` |
| `dokumen.diupload` | `docs.123` | `doc_id`, `doctype`, `filename` |
| `dokumen.disetujui` | `docs.123` | `doc_id`, `doctype`, `catatan` |
| `dokumen.ditolak` | `docs.123` | `doc_id`, `alasan_penolakan` |
| `sistem.broadcast` | `system.broadcast` | `judul`, `isi`, `link_url?` |

---

## Validation Rules
- Event name harus dot-notation lowercase.
- Payload maksimal 10KB.
- Timestamp harus unix milliseconds.
- Jangan kirim field sensitif seperti secret, token, atau password.

---

## Ordering Rules
- Untuk satu channel, event dipertahankan urutannya sejauh memungkinkan.
- Jika ada retry atau delay Redis, client harus menganggap event sebagai eventually consistent.
- Jika event duplicate diterima, client boleh dedupe berdasarkan `meta.request_id` atau `ts + event + channel`.

---

## Frontend Handling
- Business event → render ke UI.
- System event → update state connection / presence.
- Unknown event → log warning, jangan crash.

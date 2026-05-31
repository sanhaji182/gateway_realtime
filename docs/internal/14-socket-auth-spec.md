# 14 – Socket Auth Spec

## Purpose
Spesifikasi endpoint otorisasi untuk private dan presence channel.

## Endpoint
```
POST /api/socket/auth
```

## Auth
- Wajib login dashboard atau memiliki session valid.
- Untuk app client publik, bisa menggunakan token app + user session dari backend aplikasi masing-masing.
- Response harus berupa signature yang bisa diverifikasi gateway.

---

## Request
```json
{
  "socket_id": "ws_a1b2c3",
  "channel_name": "private-orders.99",
  "user_id": "u-881",
  "app_id": "app_a1b2c"
}
```

## Response
```json
{
  "data": {
    "auth": "app_key:sha256signature",
    "channel_data": null
  }
}
```

### For Presence Channel
```json
{
  "data": {
    "auth": "app_key:sha256signature",
    "channel_data": {
      "user_id": "u-881",
      "user_info": {
        "name": "San Haji",
        "role": "admin"
      }
    }
  }
}
```

---

## Validation Rules
Server harus memvalidasi:
- user terautentikasi
- app_id valid
- socket_id valid dan masih aktif
- channel_name sesuai permission user
- user hanya bisa subscribe channel yang dia miliki aksesnya

### Access Matrix
| Channel Type | Requirement |
|-------------|-------------|
| Public | no auth |
| Private | user must own resource / be authorized |
| Presence | user must be authorized + provide member info |
| Wildcard | admin only |

---

## Error Response
```json
{ "error": { "code": "AUTH_REQUIRED", "message": "Login required" } }
```
```json
{ "error": { "code": "FORBIDDEN", "message": "Not allowed to join this channel" } }
```
```json
{ "error": { "code": "INVALID_SOCKET", "message": "Socket not found" } }
```

---

## Signature Format
```
sha256(app_secret, socket_id + ":" + channel_name)
```

Untuk presence:
```
sha256(app_secret, socket_id + ":" + channel_name + ":" + channel_data_json)
```

Format final output:
```
app_key:signature_hex
```

---

## Client Flow
1. Client connect ke gateway.
2. Client ingin subscribe private/presence channel.
3. Client POST ke `/api/socket/auth`.
4. Backend balikin `auth` string.
5. Client kirim signature ke gateway.
6. Gateway verifikasi dan join channel.

---

## Security Notes
- Jangan pernah expose app secret di browser.
- Auth endpoint harus rate limited.
- Signature harus deterministic.
- Gunakan JSON canonicalization kalau channel_data dikirim.

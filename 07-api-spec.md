# 07 – API Spec (Dashboard Internal REST API)

## Base URL
```
/api/v1
```

## Auth Header
Semua endpoint memerlukan:
```
Authorization: Bearer <session_token>
```
Session token didapat dari login endpoint. Bila tidak valid → 401.

## Response Format
Semua response menggunakan format konsisten:
```json
// Success
{ "data": { ... }, "meta": { "page": 1, "total": 100 } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "App not found" } }
```

---

## Auth

### POST /api/auth/login
```json
// Request
{ "email": "admin@internal.com", "password": "secret" }

// Response 200
{ "data": { "token": "eyJ...", "expires_at": 1746480000, "user": { "id": "u-1", "name": "San Haji", "role": "admin" } } }

// Response 401
{ "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password is incorrect" } }
```

### POST /api/auth/logout
```json
// Response 200
{ "data": { "ok": true } }
```

### GET /api/auth/me
```json
// Response 200
{ "data": { "id": "u-1", "name": "San Haji", "email": "admin@internal.com", "role": "admin" } }
```

---

## Overview

### GET /api/overview
```json
// Response 200
{
  "data": {
    "kpi": {
      "active_connections": 1284,
      "events_per_minute": 342,
      "webhook_success_rate": 99.1,
      "error_rate": 0.3
    },
    "health": [
      { "name": "Gateway",        "status": "operational", "detail": "0 errors in last 1h" },
      { "name": "Broker (Redis)", "status": "operational", "detail": "latency 1ms" },
      { "name": "Webhook Worker", "status": "degraded",    "detail": "3 retries pending" }
    ],
    "recent_events":   [ /* lihat Events endpoint */ ],
    "recent_failures": [ /* lihat Webhooks endpoint */ ]
  }
}
```

### GET /api/overview/traffic?range=1h
Query params: `range` = 30m | 1h | 24h
```json
{
  "data": {
    "points": [
      { "ts": 1746432000, "value": 312 },
      { "ts": 1746432060, "value": 287 }
    ]
  }
}
```

---

## Apps

### GET /api/apps
Query params: `search`, `status` (active|inactive), `sort` (name|connections|events), `page`, `per_page` (default 20)
```json
{
  "data": [
    {
      "id": "app_a1b2c",
      "name": "marketplace",
      "status": "active",
      "connections": 284,
      "events_today": 12481,
      "webhook_status": "ok",
      "updated_at": "2026-05-05T14:22:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 5 }
}
```

### POST /api/apps
```json
// Request
{ "name": "my-app", "environment": "production" }

// Response 201
{ "data": { "id": "app_x9y8z", "name": "my-app", "key": "pk_live_...", "secret": "sk_live_..." } }
```

### GET /api/apps/:id
```json
{
  "data": {
    "id": "app_a1b2c",
    "name": "marketplace",
    "status": "active",
    "key": "pk_live_a1b2c3",
    "secret": null,
    "allowed_origins": ["https://marketplace.internal"],
    "webhook_endpoints": [
      { "id": "wh_1", "url": "https://api.internal/hook", "events": ["*"], "status": "ok" }
    ],
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### PATCH /api/apps/:id
```json
// Request (semua field opsional)
{ "name": "new-name", "status": "inactive", "allowed_origins": ["https://example.com"] }
```

### POST /api/apps/:id/rotate-secret
```json
// Response 200
{ "data": { "secret": "sk_live_newvalue..." } }
```

### GET /api/apps/:id/secret
```json
// Response 200 — hanya dipanggil saat user klik "Reveal"
{ "data": { "secret": "sk_live_a1b2c3..." } }
```

### GET /api/apps/:id/stats
```json
{
  "data": {
    "peak_connections": { "value": 284, "at": "2026-05-05T10:22:00Z" },
    "top_channels": [
      { "name": "orders.#", "event_count": 882 },
      { "name": "chat.#",   "event_count": 541 }
    ]
  }
}
```

### DELETE /api/apps/:id
Soft delete. Response 200 `{ "data": { "ok": true } }`.

---

## Webhook Endpoints (per App)

### POST /api/apps/:id/webhooks
```json
{ "url": "https://api.internal/hook", "events": ["order.paid", "order.new"], "secret": "optional" }
```

### PATCH /api/apps/:app_id/webhooks/:wh_id
### DELETE /api/apps/:app_id/webhooks/:wh_id

---

## Connections

### GET /api/connections
Query params: `app_id`, `state` (live|idle), `channel`, `search`, `page`, `per_page` (default 50)
```json
{
  "data": [
    {
      "socket_id": "ws_a1b2c3",
      "app_id": "app_a1b2c",
      "app_name": "marketplace",
      "user_id": "u-881",
      "ip": "10.0.1.4",
      "channels": ["orders.99","chat.55"],
      "channel_count": 2,
      "connected_at": "2026-05-05T10:22:01Z",
      "last_seen_at": "2026-05-05T14:22:01Z",
      "state": "live"
    }
  ],
  "meta": { "page": 1, "total": 284 }
}
```

### GET /api/connections/:socket_id
Detail satu koneksi. Response shape sama seperti item di atas + field tambahan:
```json
{
  "data": {
    "...": "same as list item",
    "user_agent": "Mozilla/5.0...",
    "subscribed_channels": [
      { "name": "orders.99", "joined_at": "2026-05-05T10:22:05Z" }
    ],
    "recent_events": [ { "ts": "...", "event": "order.paid", "channel": "orders.99" } ]
  }
}
```

### DELETE /api/connections/:socket_id
Force disconnect. Response 200 `{ "data": { "ok": true } }`.

---

## Events

### GET /api/events
Query params: `app_id`, `channel`, `event`, `status` (ok|error), `range` (30m|1h|24h), `search`, `page`, `per_page` (default 50)
```json
{
  "data": [
    {
      "id": "evt_001",
      "app_id": "app_a1b2c",
      "app_name": "marketplace",
      "channel": "orders.99",
      "event": "order.paid",
      "source": "ci4-api",
      "size_bytes": 312,
      "status": "ok",
      "request_id": "req_aa1",
      "published_at": "2026-05-05T14:22:01.842Z"
    }
  ],
  "meta": { "page": 1, "total": 12481 }
}
```

### GET /api/events/:id
```json
{
  "data": {
    "...": "same as list item",
    "payload": { "order_id": 123, "status": "paid", "amount": 150000 },
    "delivery": {
      "subscriber_count": 3,
      "latency_ms": 4,
      "webhook_triggered": true,
      "webhook_log_id": "whl_551"
    },
    "raw": { "...full internal metadata..." }
  }
}
```

---

## Webhooks

### GET /api/webhooks/logs
Query params: `app_id`, `endpoint`, `status` (success|failed|retrying), `range`, `search`, `page`, `per_page`
```json
{
  "data": [
    {
      "id": "whl_551",
      "app_id": "app_a1b2c",
      "app_name": "marketplace",
      "endpoint_url": "https://api.internal/hook",
      "event": "order.paid",
      "status": "success",
      "http_code": 200,
      "latency_ms": 142,
      "attempt": 1,
      "triggered_at": "2026-05-05T14:22:01.812Z"
    }
  ],
  "meta": { "page": 1, "total": 1204 }
}
```

### GET /api/webhooks/logs/:id
```json
{
  "data": {
    "...": "same as list item",
    "request": {
      "method": "POST",
      "headers": { "Content-Type": "application/json", "X-Gateway-Signature": "sha256=..." },
      "body": { "...payload..." }
    },
    "response": {
      "status": 200,
      "body": "ok",
      "latency_ms": 142
    },
    "error": null,
    "attempts": [
      { "attempt": 1, "at": "2026-05-05T14:22:01Z", "status": "success", "http_code": 200 }
    ]
  }
}
```

### POST /api/webhooks/logs/:id/retry
Manual retry satu delivery.
```json
// Response 200
{ "data": { "ok": true, "new_log_id": "whl_552" } }
```

---

## Settings

### GET /api/settings
```json
{
  "data": {
    "general": { "display_name": "Internal Event Gateway", "base_url": "https://gateway.internal", "environment": "production" },
    "security": { "cors_mode": "strict", "token_expiry_minutes": 60 },
    "rate_limits": { "reconnects_per_ip": 10, "publish_per_app_per_second": 100 },
    "retention": { "event_log": "24h", "webhook_log": "7d", "connection_log": "1h" }
  }
}
```

### PATCH /api/settings
Partial update. Kirim hanya section yang berubah.

### GET /api/settings/environment
```json
{
  "data": {
    "gateway_version": "1.2.0",
    "go_version": "1.22.3",
    "redis_version": "7.2.4",
    "redis_status": "connected",
    "uptime_seconds": 86400,
    "build_commit": "a1b2c3d"
  }
}
```

---

## Admin Users

### GET /api/admin/users
### POST /api/admin/users/invite
```json
{ "email": "newadmin@internal.com", "role": "admin" }
```
### PATCH /api/admin/users/:id
### DELETE /api/admin/users/:id

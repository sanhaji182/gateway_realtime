# SaaS Architecture — Gateway Realtime Cloud

> Dokumen ini adalah catatan untuk agent yang akan membangun SaaS Control Plane di atas Gateway Core.
> Baca seluruhnya sebelum mulai coding. Public repo tetap clean — semua SaaS code di private repo.
>
> **Status saat ini (12 Mei 2026):** Fase 1-4 sudah selesai. Private repo `gateway_cloud` sudah berisi
> implementasi penuh: tenant auth, rate limiting, usage tracking, SaaS API.

---

## Model Bisnis: Open Core

```
gateway_realtime/ (PUBLIC, MIT)        gateway_cloud/ (PRIVATE, Proprietary)
├── app/           frontend dashboard  ├── cmd/server/    cloud binary entrypoint
├── backend_go/    WebSocket core      ├── cloud/         tenant, rate limit, usage, api
│   └── extensions/  ← interfaces     ├── web/           Next.js SaaS frontend (coming)
├── lib/socket/    TypeScript SDK      ├── worker/        background jobs (coming)
└── ...                                ├── Dockerfile.cloud
                                       └── docker-compose.prod.yml
```

| | Open Source | SaaS (Cloud) |
|---|---|---|
| **Harga** | Gratis | Free tier → Pro → Enterprise |
| **Multi-tenant** | ❌ | ✅ (tenant = project, X-Tenant-Key header) |
| **Rate limiting** | ❌ | ✅ (Redis token bucket per plan) |
| **Billing** | ❌ | ✅ (Stripe — webhook stub ready) |
| **Usage analytics** | ❌ | ✅ |
| **Dashboard** | Self-host | Managed + team features (coming) |

---

## Tech Stack SaaS

| Layer | Pilihan |
|---|---|
| Control Plane API | Go (extend `gateway_realtime/backend_go`) |
| Database | PostgreSQL (users, tenants, billing, usage) |
| Cache | Redis (sudah ada via core — sharing instance) |
| Billing | Stripe (Go SDK `github.com/stripe/stripe-go`) |
| Auth SaaS | X-Tenant-Key + X-User-ID header (v1) / Clerk next |
| Landing page | Next.js (satu monorepo dengan dashboard — coming) |
| Deployment | Docker Compose atau Fly.io / Railway |
| CI/CD | GitHub Actions (terpisah dari public CI) |

---

## Extension Points (Sudah Siap di Core)

Core sudah menyediakan 3 interface di `backend_go/extensions/extensions.go`:

### 1. Authenticator
```go
type Authenticator interface {
    Authenticate(r *http.Request) (userID string, tenantID string, ok bool)
}
```
**SaaS implementation:** `cloud.TenantAuthenticator` — validasi `X-Tenant-Key` header ke PostgreSQL.

### 2. RateLimiter
```go
type RateLimiter interface {
    Allow(tenantID string, key string, limit int) bool
}
```
**SaaS implementation:** `cloud.PlanRateLimiter` — Redis token bucket per tenant + plan.

### 3. EventHook
```go
type EventHook interface {
    OnPublish(tenantID, channel, event string, payloadSize int64)
    OnSubscribe(tenantID, channel, socketID string)
    OnUnsubscribe(tenantID, channel, socketID string)
    OnConnect(tenantID, socketID string)
    OnDisconnect(tenantID, socketID string)
}
```
**SaaS implementation:** `cloud.UsageTracker` — async batch insert ke `usage_events`.

### Cara Inject di SaaS Binary (SUDAH DIIMPLEMENTASI)

Di `gateway_cloud/cmd/server/main.go`:
```go
import (
    "go-gateway/handler"    // core handler
    "gateway_cloud/cloud"   // SaaS implementations
)

func main() {
    // ... init Redis, PostgreSQL, Hub ...

    tenantAuth := cloud.TenantAuthenticator{DB: db}
    planLimiter := cloud.PlanRateLimiter{Redis: redisClient, DB: db}
    usageTracker := cloud.NewUsageTracker(db)

    mux.Handle("/ws", handler.WSHandler{
        Auth: tenantAuth, RateLimiter: planLimiter, EventHook: usageTracker,
    })
    mux.Handle("/api/socket/auth", handler.AuthHandler{
        Auth: tenantAuth, RateLimiter: planLimiter, EventHook: usageTracker,
    })

    // SaaS routes
    mux.HandleFunc("/api/cloud/register", cloudAPI.Register)
    mux.HandleFunc("/api/cloud/usage", cloudAPI.Usage)
    mux.HandleFunc("/api/cloud/tenant", cloudAPI.GetTenant)
    mux.HandleFunc("/api/cloud/stripe/webhook", cloudAPI.StripeWebhook)
}
```

**Perhatian:** Jangan modifikasi `backend_go/main.go` di public repo. Inject extension di private `cmd/server/main.go` saja — touchpoint satu-satunya adalah interface di `extensions/extensions.go`.

---

## Database Schema

Sudah diimplementasikan via auto-migration (`cloud/migrate.go`):

```sql
CREATE TABLE tenants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    plan       TEXT NOT NULL DEFAULT 'free',  -- free, pro, enterprise
    api_key    TEXT NOT NULL UNIQUE,           -- pk_... prefix
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE usage_events (
    id            BIGSERIAL PRIMARY KEY,
    tenant_id     UUID REFERENCES tenants(id),
    event_type    TEXT NOT NULL,          -- connect, disconnect, subscribe, unsubscribe, publish
    channel       TEXT DEFAULT '',
    payload_bytes BIGINT DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_usage_tenant_date ON usage_events(tenant_id, created_at);
CREATE INDEX idx_usage_type ON usage_events(event_type, created_at);
```

---

## Plan Tiers

| Tier | Events/Menit | Koneksi | Harga |
|---|---|---|---|
| **Free** | 100 | 5 | Gratis |
| **Pro** | 10,000 | 1,000 | $/bulan |
| **Enterprise** | 100,000 | 10,000 | Custom |

---

## API Endpoint SaaS (Sudah Implementasi)

| Method | Path | Function | Status |
|---|---|---|---|
| `POST` | `/api/cloud/register` | Daftar tenant baru → dapat API key | ✅ Done |
| `GET` | `/api/cloud/usage?tenant_id=X&period=24h` | Usage analytics per tenant | ✅ Done |
| `GET` | `/api/cloud/tenant?api_key=pk_...` | Detail tenant via API key | ✅ Done |
| `POST` | `/api/cloud/stripe/webhook` | Stripe webhook handler | 🚧 Stub — perlu verify signature |

---

## Deployment (SaaS Binary)

```bash
# Di private repo gateway_cloud/
docker compose -f docker-compose.prod.yml up -d
```

Services di `docker-compose.prod.yml`:
- PostgreSQL 16 (tenants, usage_events)
- Redis 7 (pub/sub + rate limit bucket)
- Gateway Cloud:4001 (Go binary SaaS)

---

## Checklist Agent Selanjutnya

### ✅ Fase 1 — Scaffold Private Repo (DONE)
- [x] Buat private repo `gateway_cloud`
- [x] Init Go module + import core
- [x] Buat `cmd/server/main.go` — inject extensions + SaaS routes

### ✅ Fase 2 — Multi-Tenant (DONE)
- [x] Registration endpoint (POST /api/cloud/register)
- [x] API key generation per tenant (pk_ prefix, 32 hex chars)
- [x] TenantAuthenticator (baca X-Tenant-Key + X-User-ID header)
- [x] Auto-migration PostgreSQL schema

### ✅ Fase 3 — Rate Limiting + Billing (DONE)
- [x] PlanRateLimiter (Redis INCR + EXPIRE token bucket)
- [x] UsageTracker (async batch insert via buffered channel)
- [x] Stripe webhook stub (acknowledge)

### ✅ Fase 4 — SaaS API (DONE)
- [x] Usage analytics endpoint (GET /api/cloud/usage)
- [x] Tenant lookup endpoint (GET /api/cloud/tenant)
- [x] Docker Compose production (PostgreSQL + Redis + gateway-cloud)
- [x] Dockerfile.cloud (multi-stage Go build)
- [x] Full Go doc comments di semua file SaaS

### ✅ Fase 5 — SaaS Frontend (DONE)
- [x] Next.js app di `web/` — signup page, login, dashboard
- [x] Landing page marketing (hero, pricing, docs link)
- [x] Usage dashboard (chart events per tenant)
- [x] Tenant management UI (buat tenant, lihat API key)

### Fase 6 — Production (NEXT)
- [ ] Deploy ke Fly.io / Railway / VPS
- [ ] Domain + SSL
- [ ] Stripe integration penuh — webhook verify signature + update plan
- [ ] Stripe Customer Portal — billing self-service
- [ ] Email notification (welcome, usage warning, payment receipt)
- [ ] Monitoring (Sentry, Grafana, health endpoint)
- [ ] Private GitHub repo → push commit

---

## Jangan Sentuh Ini

- `backend_go/hub/` — core pub/sub logic
- `backend_go/handler/` — sudah support extension injection
- `lib/socket/` — client-side SDK
- `app/api/` — REST API dashboard (SaaS bisa pakai atau bikin sendiri)

## Boleh Sentuh Ini

- `backend_go/extensions/` — tambah interface jika SaaS butuh hook tambahan
- `SaaS_ARCHITECTURE.md` — update dokumen ini saat ada perubahan arsitektur

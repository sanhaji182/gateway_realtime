# SaaS Architecture — Gateway Realtime Cloud

> Dokumen ini adalah catatan untuk agent yang akan membangun SaaS Control Plane di atas Gateway Core.
> Baca seluruhnya sebelum mulai coding. Public repo tetap clean — semua SaaS code di private repo.

---

## Model Bisnis: Open Core

```
gateway_realtime/ (PUBLIC, MIT)        gateway_cloud/ (PRIVATE, Proprietary)
├── app/           frontend dashboard  ├── control/       tenant mgmt, billing, usage
├── backend_go/    WebSocket core      ├── web/           landing page, signup, billing UI
├── lib/socket/    TypeScript SDK      ├── go.mod         → import gateway_realtime/backend_go
└── ...                                └── worker/        event processor, analytics
```

| | Open Source | SaaS (Cloud) |
|---|---|---|
| **Harga** | Gratis | Free tier → Pro → Enterprise |
| **Multi-tenant** | ❌ | ✅ (tenant = project) |
| **Rate limiting** | ❌ | ✅ (Redis token bucket) |
| **Billing** | ❌ | ✅ (Stripe) |
| **Usage analytics** | ❌ | ✅ |
| **Dashboard** | Self-host | Managed + team features |

---

## Tech Stack SaaS

| Layer | Pilihan |
|---|---|
| Control Plane API | Go (extend `gateway_realtime/backend_go`) |
| Database | PostgreSQL (users, tenants, billing, usage) |
| Cache | Redis (sudah ada via core) |
| Billing | Stripe (Go SDK `github.com/stripe/stripe-go`) |
| Auth SaaS | Clerk / NextAuth.js (ganti demo auth) |
| Landing page | Next.js (satu monorepo dengan dashboard) |
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
**SaaS implementation:** validate API key + tenant lookup dari PostgreSQL.

### 2. RateLimiter
```go
type RateLimiter interface {
    Allow(tenantID string, key string, limit int) bool
}
```
**SaaS implementation:** Redis token bucket — limit dari plan tenant (free: 100/menit, pro: 10k/menit).

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
**SaaS implementation:** write ke PostgreSQL `usage_events` table untuk billing per-event.

### Cara Inject di SaaS Binary

Di `gateway_cloud/cmd/server/main.go`:
```go
import (
    "gateway_realtime/extensions"
    "gateway_cloud/cloud"  // SaaS implementations
)

func main() {
    main.Ext = extensions.ExtensionPoints{
        Auth:        cloud.TenantAuthenticator{DB: db},
        RateLimiter: cloud.PlanRateLimiter{Redis: rdb, DB: db},
        EventHook:   cloud.UsageTracker{DB: db},
    }
    main() // panggil core main()
}
```

**Perhatian:** Jangan modifikasi `main()` di `gateway_realtime/backend_go/main.go`. Jaga variabel `Ext` yang sudah exported — tu adalah satu-satunya touchpoint.

---

## Database Schema (Minimal)

```sql
-- Tenants
CREATE TABLE tenants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    plan       TEXT NOT NULL DEFAULT 'free',  -- free, pro, enterprise
    api_key    TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage per tenant (untuk billing)
CREATE TABLE usage_events (
    id         BIGSERIAL PRIMARY KEY,
    tenant_id  UUID REFERENCES tenants(id),
    event_type TEXT NOT NULL,          -- publish, subscribe, connect
    channel    TEXT,
    payload_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_usage_tenant_date ON usage_events(tenant_id, created_at);

-- Users (yang login ke SaaS dashboard)
CREATE TABLE users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID REFERENCES tenants(id),
    email      TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Endpoint SaaS (Tambahan)

| Method | Path | Function |
|---|---|---|
| `POST` | `/api/cloud/register` | Signup tenant + dapat API key |
| `GET` | `/api/cloud/usage` | Usage dashboard per tenant |
| `POST` | `/api/cloud/webhook/stripe` | Stripe webhook handler |
| `GET` | `/api/cloud/billing` | Billing portal (Stripe Customer Portal) |

---

## Deployment (SaaS Binary)

```yaml
# docker-compose.prod.yml — di private repo
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
  gateway-cloud:
    build:
      context: .
      dockerfile: Dockerfile.cloud
    environment:
      - DATABASE_URL=postgres://...
      - STRIPE_SECRET_KEY=sk_live_...
      - STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Checklist Agent Selanjutnya

### Fase 1 — Scaffold Private Repo
- [ ] Buat private repo `gateway_cloud`
- [ ] Init Go module: `go mod init gateway_cloud`
- [ ] Import core: `go get github.com/sanhaji182/gateway_realtime@v0.1.0`
- [ ] Buat `cmd/server/main.go` yang panggil core + inject extensions

### Fase 2 — Multi-Tenant
- [ ] Registration endpoint (email + password)
- [ ] API key generation per tenant
- [ ] TenantAuthenticator (read API key dari header `X-Tenant-Key`)

### Fase 3 — Rate Limiting + Billing
- [ ] PlanRateLimiter (Redis token bucket, limit per tier)
- [ ] UsageTracker → write ke `usage_events`
- [ ] Stripe integration (subscription, webhook)

### Fase 4 — SaaS Dashboard
- [ ] Landing page (marketing) di `/`
- [ ] Signup/login page
- [ ] Dashboard SaaS (gabung dengan core dashboard atau terpisah)
- [ ] Usage analytics page

### Fase 5 — Production
- [ ] Deploy ke Fly.io / Railway / VPS
- [ ] Domain + SSL
- [ ] Monitoring (Sentry, Grafana)
- [ ] Status page (health endpoint sudah ada via core)

---

## Jangan Sentuh Ini

- `backend_go/hub/` — core pub/sub logic
- `backend_go/handler/` — sudah support extension injection
- `lib/socket/` — client-side SDK
- `app/api/` — REST API dashboard (SaaS bisa pakai atau bikin sendiri)

## Boleh Sentuh Ini

- `backend_go/main.go` — hanya jika extension injection butuh field baru
- `backend_go/extensions/` — tambah interface jika SaaS butuh hook tambahan

# Changelog

## v0.4.0 — 2026-05-31

> Rilis besar: pematangan produksi + fitur realtime + ekosistem SDK. Seluruh perubahan di repo open-source `gateway`.

### Added — Fitur realtime
- **Message history / replay** — event disimpan ber-cap di Redis (`history:<channel>`); WS `{type:"history"}` dan SDK `channel.history(count, after?)`. Env: `HISTORY_MAX`, `HISTORY_TTL`.
- **Resume-on-reconnect** — opsi subscribe `{ resume: true }`; setelah reconnect, SDK otomatis me-replay event yang terlewat (berbasis history + ts terakhir).
- **Client events** — `channel.trigger("client-...", data)` pada channel private/presence (fan-out lintas-node, ber-rate-limit).
- **Encrypted channels (E2E)** — channel `private-encrypted-*`, payload AES-256-GCM; kunci HKDF dari shared secret + nama channel; auto-dekripsi via opsi `encryptionKey`.
- **Presence lintas-node** — state presence dibagikan via Redis + TTL anti-orphan (refresh periodik).
- **Webhook delivery nyata** — kirim event ke endpoint (`GATEWAY_WEBHOOKS`) dengan HMAC `X-Gateway-Signature` + retry + log; **event lifecycle** `channel_occupied`/`channel_vacated`, `member_added`/`member_removed`.
- **Isolasi multi-app (opsional)** — klaim JWT `app` membatasi koneksi ke namespace channel app-nya (backward-compatible).
- **Kompatibilitas protokol Pusher (subset)** — endpoint `/app/{key}`; klien `pusher-js` bisa connect (handshake, subscribe/unsubscribe/ping, envelope event).
- **Rate limit per-koneksi** — token bucket anti-flood (`MSG_RATE_PER_SEC`, `MSG_BURST`).

### Added — Observability, SDK, deployment
- **Observability** — endpoint `/stats` (terproteksi JWT admin) untuk koneksi & channel nyata; `/metrics` format Prometheus (`gateway_connections`, `gateway_channels`, `gateway_uptime_seconds`).
- **Paket npm** — `@gateway-realtime/sdk` (SDK TS) dan `@gateway-realtime/react` (hooks `useGateway`/`useChannel`/`usePresence`) + workflow publish npm.
- **Deployment** — workflow build & push image ke GHCR (tag `v*`), `docker-compose.prod.yml`, manifest Kubernetes (`deploy/k8s/`).
- **OpenAPI** — `docs/openapi.yaml` (OpenAPI 3.0) + tabel perbandingan vs Pusher/Soketi/Ably di README.
- **Docs portal** — Framework Guides (CodeIgniter 4, Laravel), Bring Your Own JWT, Pusher Compatibility, Encrypted Channels, React Hooks, Reliability.

### Changed
- **Dashboard pakai data nyata** — Connections, Overview, Events, Apps, Webhooks membaca data live (fallback demo bila gateway/Redis tidak tersedia).
- **Auth dashboard configurable** — admin via `GATEWAY_ADMIN_EMAIL`/`GATEWAY_ADMIN_PASSWORD`; akun viewer demo dimatikan di mode produksi.
- **Rate limit IP & ping** configurable via env (`RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`, `PING_INTERVAL`).

### Fixed
- **Wildcard fan-out** — publish ke channel konkret kini benar sampai ke subscriber pola `x.*` tanpa over-match.
- **Derivasi kunci encrypted channel** — bergantung pada shared secret + nama channel (sebelumnya hanya nama channel).

### Security
- 🔴 `/api/socket/token` wajib sesi login; role diambil dari sesi (bukan `admin` untuk semua).
- 🟡 JWT di-pin ke `alg: HS256` (cegah alg-confusion).
- 🟡 Prefix kunci demo `pk_live_`/`sk_live_` → `pk_test_`/`sk_test_`.

### Tests / CI
- `go test -race ./...` + integration test Redis fan-out (service redis di CI) + benchmark fan-out.
- Cakupan test Go: `auth`, `handler`, `hub`, `ratelimit`; socket SDK 31/31.

### Env vars baru
`MSG_RATE_PER_SEC`, `MSG_BURST`, `RATE_LIMIT_RPS`, `RATE_LIMIT_BURST`, `HISTORY_MAX`, `HISTORY_TTL`, `GATEWAY_WEBHOOKS`, `GATEWAY_APP_SECRETS`, `GATEWAY_ADMIN_EMAIL`, `GATEWAY_ADMIN_PASSWORD`, `GATEWAY_INTERNAL_URL`.

### Catatan upgrade
- Multi-node: `channel_occupied`/`channel_vacated` dihitung per-node-local (bisa terkirim >1 di multi-node). Kompat Pusher untuk channel private/presence memakai `JWT_SECRET` (bukan app-secret Pusher).

## v0.3.1 — 2026-05-12

## v0.3.2 — 2026-05-12

### Security
- 🔴 **Session token**: plain base64 → signed JWT (HMAC-SHA256) dengan timing-safe verify
- 🔴 **App secrets**: hardcoded di public repo → load dari env `GATEWAY_APP_SECRETS`
- 🟡 **WebSocket auth**: token dibaca dari cookie `gateway_session` dulu, query param sebagai fallback
- 🟡 **HMAC compare**: `===` → `timingSafeEqual` di TypeScript (Go sudah `hmac.Equal`)
- 🟡 **CSRF protection**: signed token + verify di `POST /api/v1/events` + endpoint `GET /api/v1/settings`
- 📄 **SECURITY.md**: diperbarui dengan detail mekanisme auth baru


### Changed
- **Sidebar labels disesuaikan dengan fungsi sebenarnya**: Products → Apps, Marketplaces → Connections, Intelligence → Events, Price Compare → Webhooks
- **Overview heading & KPIs**: Marketplace Intelligence → Gateway Dashboard, Tracked Products → Active Connections, Active Scrapers → Events/Minute, Marketplace Health → Service Health
- **Branding**: Marketlytics → Gateway di sidebar, topbar, dan login page
- **Column headers**: Connections page (Marketplace → App, Products → Channels), Webhooks page (Product → App, Marketplace → Endpoint)
- **TypeScript**: zero errors typecheck

## v0.3.0 — 2026-05-12

### Added
- **SaaS Frontend** di `gateway_cloud/web/` — Next.js 16, landing page (hero, features grid, pricing table), signup, login via API key, tenant dashboard (usage stats per periode), settings page (copy API key, plan tiers, upgrade info)
- **Bilingual README** — `README.md` (English) + `README.id.md` (Bahasa Indonesia) dengan link silang
- **Author section** di README dengan LinkedIn profile
- **AI transparency** — blurb di README bahwa project ini AI-assisted, human-architected & reviewed
- **Agent Instructions** di `gateway_cloud/AGENTS.md` untuk koordinasi pengembangan SaaS layer

### Changed
- **SaaS_ARCHITECTURE.md**: Fase 5 (SaaS Frontend) ditandai ✅ DONE
- **README**: rewrite full ke English, content tetap dengan tone profesional

### Fixed
- **JWT_SECRET sync**: `token/route.ts` fallback secret disamakan dengan Go Gateway core (`change-me-in-production-64-chars-min`)
- **Docker build context**: `Dockerfile.cloud` sekarang copy `gateway/backend_go/` ke build context untuk resolve `replace` directive
- **Port conflicts**: `docker-compose.full.yml` external port Redis → 6380, PostgreSQL → 5433
- **Dashboard Dockerfile**: `public/` folder dibuat agar `COPY` tidak gagal

## v0.2.0 — 2026-05-12

### Added
- **Landing page** — `/` publik dengan hero, 6 fitur grid, CTA "docker compose up", GitHub link
- **Open-source readiness**: CODE_OF_CONDUCT.md, SECURITY.md, GitHub community docs
- **CI/CD**: GitHub Actions workflow — typecheck, lint, 28 test, build, Go build on push/PR
- **Issue templates**: bug report, feature request, pull request template
- **Routing**: `proxy.ts` diperbarui — `/`, `/docs`, login sebagai public routes
- **SaaS extension points**: `backend_go/extensions/extensions.go` — Authenticator, RateLimiter, EventHook interfaces
- **SaaS architecture blueprint**: `SaaS_ARCHITECTURE.md` — model open-core, DB schema, plan tiers, deployment guide
- **Go handler update**: `ws.go` dan `auth.go` sudah consume extension interfaces

### Changed
- **AGENTS.md**: tambah section SaaS Extension Points untuk agent context
- **README**: hapus "Proprietary — internal use only", konsisten MIT license
- **.gitignore**: tambah `.commandcode/` untuk mencegah autogenerated file ke-commit

### Fixed
- Go Dockerfile: EXPOSE port 4000 (sebelumnya 3000)
- Next.js config: tambah `output: "standalone"` untuk production Docker multistage build

### Security
- `SECURITY.md` menambahkan panduan vulnerability reporting via GitHub private advisory

## v0.1.0 — 2026-05-11

### Added
- **Next.js 16 Dashboard** — App Router, Turbopack, 9 routes
- **Go WebSocket Gateway** — Redis pub/sub, JWT auth, channel management
- **TypeScript SDK** — `lib/socket/` framework-agnostic
- **Webhook System** — delivery log, retry, monitoring
- **28 test cases** — `node:test` untuk semua module socket
- **PHP SDK** — `sdk/php/` untuk backend PHP
- **Docker Compose** — Redis + Go Gateway + Next.js

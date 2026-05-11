# Changelog

## v0.1.0 — 2026-05-11

### Added
- **Realtime WebSocket Gateway** — Go server with Redis pub/sub, JWT auth, channel management
- **Channels**: public, private, presence, wildcard, encrypted (AES-256-GCM)
- **REST API** — publish events (single + batch), HMAC-SHA256 auth, app key/secret system
- **Dashboard** — 10-page marketplace intelligence UI (Next.js 16, Tailwind)
  - Overview, Products, Product Detail, Marketplaces, Intelligence, Price Compare, Orders, Settings, Playground
- **Realtime Playground** — WebSocket live stream, channel subscribe, HMAC-signed event publishing
- **Order Notification System** — built-in simulator, real-time order feed with KPIs
- **Developer Documentation** — portal di `/docs`, multi-language auth snippets (JS, Go, PHP, Python)
- **TypeScript SDK** — framework-agnostic `lib/socket/` with GatewayClient, channel subscription, auto-reconnect
- **28 test cases** — `node:test` runner, 100% pass
- **Docker Compose** — one-command deployment (Redis + Go gateway + Next.js)
- **MIT License**

### Security
- HMAC-SHA256 REST publish auth (X-App-Key + X-Signature)
- JWT WebSocket handshake
- Private/presence channel HMAC subscription auth
- Encrypted channels via AES-256-GCM + HKDF
- Production security headers (CSP, CORS, frame options)

# 🚀 Gateway Realtime

> 🇬🇧 [English](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-28%2F28-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Go](https://img.shields.io/badge/Go-1.22%2B-00ADD8)]()
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()

# Gateway Realtime

Self-hosted realtime event system untuk aplikasi internal — mirip Pusher, tapi berjalan di infrastruktur kamu sendiri. Dashboard Next.js 16 + Backend WebSocket Go + Redis pub/sub.


> **🤖 Dibangun dengan AI** — Project ini dikembangkan dengan bantuan AI code generation sebagai alat bantu, di bawah arahan dan review developer manusia. Setiap baris kode telah diperiksa dan diuji sebelum masuk ke production.
## Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Browser / Mobile)                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Dashboard   │  │ WebSocket SDK│  │ SDK Browser       │  │
│  │ Next.js 16  │  │ lib/socket   │  │ /sdk/gateway.js   │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                │                    │             │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
    REST API (29 routes)   WebSocket            Static SDK
          │                │                    │
┌─────────┼────────────────┼────────────────────┼─────────────┐
│         ▼                ▼                    ▼             │
│  Next.js API Routes    Go Gateway Server                    │
│  ┌───────────────┐    ┌─────────────────────┐               │
│  │ Demo Auth     │    │ HTTP + WS Server    │               │
│  │ CRUD Apps     │    │ • /ws — WebSocket   │               │
│  │ Webhooks      │    │ • /metrics          │               │
│  │ Events        │    │ • /sdk/gateway.js   │               │
│  │ Settings      │    │ • /health           │               │
│  └───────────────┘    └──────────┬──────────┘               │
│                                  │                          │
│                          ┌───────▼───────┐                  │
│                          │  Redis Pub/Sub │                 │
│                          └───────────────┘                  │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐   │
│  │  Backend Service (CI4 / Golang / Node.js)            │   │
│  │  Publish event via REST API atau PHP SDK             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Fitur

- **Dashboard Admin** — Overview, Apps, Connections, Events, Webhooks, Settings, Admin Users, Environment
- **WebSocket Gateway** — Go server dengan Redis pub/sub, JWT auth, channel management
- **Channel Types** — Public, Private, Presence, Wildcard
- **Webhook System** — Delivery log, retry, monitoring
- **Realtime SDK** — Framework-agnostic TypeScript SDK untuk browser
- **Developer Docs** — Portal dokumentasi built-in di `/docs`
- **Dark Mode** — Theme toggle dengan CSS custom properties

## Prasyarat

| Dependency | Version | Purpose |
|---|---|---|
| Node.js | ≥ 20 | Frontend Next.js |
| Go | ≥ 1.22 | Backend WebSocket gateway |
| Redis | ≥ 7 | Message broker pub/sub |
| Docker | optional | Containerized deployment |

## ⚡ One-Command Setup

```bash
git clone https://github.com/sanhaji182/gateway_realtime.git
cd gateway_realtime

docker compose up
```

Buka http://localhost:3000 → login `admin@gateway.local` / `password`.

---

## Quick Start (Development)

### 1. Clone & Install

```bash
git clone https://github.com/sanhaji182/gateway_realtime.git
cd gateway_realtime

# Frontend
npm install

# Backend Go
cd backend_go
go mod download
cd ..
```

### 2. Jalankan Redis

```bash
docker run -d --name redis-gateway \
  -p 6379:6379 \
  --restart unless-stopped \
  redis:7-alpine redis-server --appendonly yes
```

### 3. Jalankan Backend Go

```bash
cd backend_go

export PORT=4000
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=dev-secret-change-in-production
export ALLOWED_ORIGINS=http://localhost:3000

go run main.go
```

### 4. Jalankan Frontend

```bash
# Kembali ke root project
cd ..

npm run dev
```

Buka **http://localhost:3000** — Dashboard siap digunakan.

## Demo Credentials

Auth in-memory via `lib/auth/session.ts`:

| Role   | Email                | Password |
|--------|----------------------|----------|
| Admin  | admin@gateway.local  | password |
| Viewer | viewer@gateway.local | password |

## Route Map

| Route | Type | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/overview` | Dashboard | Traffic overview & KPIs |
| `/apps` | Dashboard | App management |
| `/apps/[id]` | Dashboard | App detail |
| `/connections` | Dashboard | Active WebSocket connections |
| `/events` | Dashboard | Event log |
| `/webhooks` | Dashboard | Webhook monitor & retry |
| `/settings` | Dashboard | Settings, users, environment |
| `/docs` | Public | Developer documentation portal |
| `/api/v1/*` | API | REST endpoints (29 routes) |
| `/api/socket/auth` | API | WebSocket auth handshake |
| `/api/stream/alerts` | API | SSE alert stream |

## Script Commands

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint across `.ts`/`.tsx` |
| `npm run test:socket` | Run 28 socket module tests |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/login/       # Public login
│   ├── (dashboard)/        # Authenticated pages (9 routes)
│   ├── api/                # REST API + WebSocket auth + SSE
│   └── docs/               # Built-in docs portal
├── backend_go/             # Go WebSocket gateway
│   ├── main.go             # Entrypoint + routes
│   ├── auth/               # JWT verification
│   ├── config/             # Env loader
│   ├── handler/            # HTTP & WS handlers
│   ├── hub/                # Connection hub & rooms
│   ├── redis/              # Pub/sub client
│   └── Dockerfile          # Multi-stage build
├── components/             # Shared React UI components
│   └── ui/                 # Design system (Button, Input, DataTable, etc.)
├── hooks/                  # Custom React hooks
├── lib/                    # Core logic
│   ├── api/                # API client, endpoints, types, SWR
│   ├── auth/session.ts     # Demo auth (cookies, tokens)
│   ├── docs/               # Docs content & navigation
│   └── socket/             # WebSocket SDK (auth, channels, events, presence)
├── tests/socket/           # 28 test cases for lib/socket
├── context/                # React context providers
├── content/                # Static content
├── proxy.ts                # Auth guard (Next.js 16 proxy)
├── next.config.mjs         # Security headers & config
├── eslint.config.mjs       # ESLint flat config
├── tailwind.config.ts      # Tailwind + custom design tokens
└── package.json            # Pinned dependency versions
```

## Production Deployment

### 1. Build Frontend

```bash
npm run build
# Output: .next/ (production build)
```

### 2. Environment Variables

```bash
# Frontend
NEXT_PUBLIC_API_URL=https://gateway.internal/api/v1
NEXT_PUBLIC_WS_URL=wss://gateway.internal

# Backend Go
PORT=4000
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-64-char>
ALLOWED_ORIGINS=https://dashboard.internal,https://app.internal
```

### 3. Run with PM2

```bash
# Frontend
pm2 start npm --name "gateway-frontend" -- run start

# Backend Go
pm2 start ./backend_go/gateway-server --name "gateway-backend"
```

### 4. Docker Compose (All-in-one)

```bash
# Build & start all services
docker compose up -d --build
```

### 5. Nginx Reverse Proxy

```nginx
server {
    server_name gateway.internal;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_buffering off;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

    # Backend Go (WebSocket)
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }

    location /sdk/ {
        proxy_pass http://localhost:4000;
    }

    location /metrics {
        proxy_pass http://localhost:4000;
    }
}
```

## Verification Checklist

Sebelum production, pastikan semua command ini **zero errors**:

```bash
npm run typecheck     # TypeScript type-check
npm run lint          # ESLint (0 errors, 0 warnings)
npm run test:socket   # 28/28 tests pass
npm run build         # Production build sukses
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 6.0 (strict mode) |
| Styling | Tailwind CSS 3.4 + CSS custom properties |
| UI Primitives | Radix UI (dialog, dropdown, slot) |
| Tables | TanStack Table 8 |
| Charts | Recharts 3 |
| Data Fetching | SWR 2 |
| WebSocket SDK | Custom TypeScript (`lib/socket/`) |
| Backend Gateway | Go 1.22 + Gorilla WebSocket |
| Message Broker | Redis 7 (pub/sub) |
| Auth | JWT (Go backend) + Cookie (Next.js demo) |
| Test Runner | Node.js `node:test` |
| Linting | ESLint 9 (flat config) |
| Container | Docker (multi-stage build) |


## Author

> **Dibangun oleh [Sonick Sanhaji](https://www.linkedin.com/in/sansanhaji/)** — Software developer. Arsitektur dan review oleh manusia. Eksekusi dibantu AI.

## License

MIT

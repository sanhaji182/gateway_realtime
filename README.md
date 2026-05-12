# 🚀 Gateway Realtime

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-28%2F28-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![Go](https://img.shields.io/badge/Go-1.22%2B-00ADD8)]()
[![Version](https://img.shields.io/badge/version-0.1.0-blue)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

> 🇮🇩 [Bahasa Indonesia](./README.id.md)

# Gateway Realtime

Self-hosted realtime event system — like Pusher, but free, open source, and running on your own infrastructure. Next.js 16 Dashboard + Go WebSocket Backend + Redis pub/sub.

> **🤖 AI-Assisted Development** — This project was built with AI code generation as a productivity tool, guided and reviewed by a human developer. Every line of code has been verified and tested before reaching production.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Browser / Mobile)                                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Dashboard   │  │ WebSocket SDK│  │ Browser SDK       │  │
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
│  │  Publish events via REST API or PHP SDK              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```


> 💡 **Why Gateway?** Most realtime services charge per message or lock you into their cloud. Gateway is MIT licensed — self-host it, own your data, and pay nothing. [Contribute on GitHub →](https://github.com/sanhaji182/gateway_realtime)

## Features


- **Admin Dashboard** — Overview, Apps, Connections, Events, Webhooks, Settings, Admin Users, Environment
- **WebSocket Gateway** — Go server with Redis pub/sub, JWT auth, channel management
- **Channel Types** — Public, Private, Presence, Wildcard
- **Webhook System** — Delivery log, retry, monitoring
- **Realtime SDK** — Framework-agnostic TypeScript SDK for the browser
- **Developer Docs** — Built-in documentation portal at `/docs`
- **Dark Mode** — Theme toggle with CSS custom properties

## Prerequisites

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

# Start all services
docker compose up -d
```

Dashboard: `http://localhost:3000`  
WebSocket Gateway: `ws://localhost:4000`  
Metrics: `http://localhost:4000/metrics`  
SDK: `http://localhost:4000/sdk/gateway.js`

### Manual Setup

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Go Backend
cd backend_go
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=change-me-in-production-64-chars-min \
ALLOWED_ORIGINS=http://localhost:3000 \
go run main.go

# Terminal 3: Frontend
cd ../
npm install
npm run dev
```

## Quick Test — Publish & Subscribe

```bash
# 1. Subscribe via WebSocket (websocat)
websocat "ws://localhost:4000/ws?token=YOUR_JWT_TOKEN"
> {"type":"subscribe","channel":"orders"}
# → {"type":"system","event":"subscription_succeeded",...}

# 2. Publish via REST API
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"channel":"orders","event":"order.created","data":{"id":1,"total":250000}}'
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@gateway.local | password |
| Viewer | viewer@gateway.local | password |

## Routes

| Path | Access | Description |
|---|---|---|
| `/login` | Public | Login page |
| `/` | Dashboard | Overview with charts |
| `/apps` | Dashboard | App management & API keys |
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

Before production, ensure all commands return **zero errors**:

```bash
npm run typecheck     # TypeScript type-check
npm run lint          # ESLint (0 errors, 0 warnings)
npm run test:socket   # 28/28 tests pass
npm run build         # Production build succeeds
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

> **Built by [Sonick Sanhaji](https://www.linkedin.com/in/sansanhaji/)** — Software developer. Architected and reviewed. AI-assisted execution.

## License

MIT

# Contributing to Gateway Realtime

## Quick Start

```bash
git clone https://github.com/sanhaji182/gateway_realtime.git
cd gateway_realtime

# Option 1: Docker (recommended)
docker compose up

# Option 2: Manual
# Terminal 1: Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Terminal 2: Go gateway
cd backend_go
go build -o gateway-server .
REDIS_URL=redis://localhost:6379 JWT_SECRET=dev-secret ALLOWED_ORIGINS=http://localhost:3000 ./gateway-server

# Terminal 3: Next.js
npm install && npm run dev
```

Open http://localhost:3000 — login with `admin@gateway.local` / `password`.

## Before Submitting a PR

```bash
npm run typecheck     # Must pass: 0 errors
npm run lint          # Must pass: 0 errors, 0 warnings
npm run test:socket   # Must pass: 28/28
npm run build         # Must succeed
```

## Project Structure

```
app/          Next.js App Router (pages, API routes, layouts)
backend_go/   Go WebSocket gateway (main.go, handler/, hub/, redis/, auth/)
components/   Shared React components (ui/, docs/, layout)
lib/          Core logic (api/, socket/, auth/, docs/)
tests/        Node.js test runner tests (tests/socket/)
content/      MDX documentation (content/docs/)
```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring
- `docs:` — documentation
- `test:` — test changes
- `chore:` — build/config/deps

## Questions?

Open an issue or discussion on GitHub.

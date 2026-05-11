# Repository Guidelines

## Project Structure & Module Organization

```
.
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/login/       # Public login page
│   ├── (dashboard)/        # Authenticated dashboard views
│   ├── api/                # REST API route handlers
│   └── docs/               # Public developer docs portal
├── components/             # Shared React UI components (ui/, ThemeToggle, etc.)
├── hooks/                  # Custom React hooks
├── lib/                    # Core logic library
│   ├── api/                # API client, endpoints, types, SWR helpers
│   ├── auth/session.ts     # Demo auth: session tokens, cookie mgmt
│   ├── docs/               # Docs portal content & navigation
│   └── socket/             # WebSocket SDK: auth, channels, events, presence
├── tests/socket/           # Node.js test runner tests for lib/socket
├── middleware.ts            # Auth redirect guard (public vs dashboard routes)
└── package.json
```

- `lib/socket/` is framework-agnostic TypeScript; tests use Node.js `node:test`.
- `@/` alias maps to repo root (configured in `tsconfig.json`).

## Build, Test, and Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack on http://localhost:3000 |
| `npm run build` | Production build (`next build`) |
| `npm run lint` | Run ESLint (`next lint`) |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm run test:socket` | Compile `lib/socket/*.ts` to `dist-test/`, then run `node --test tests/socket/*.test.mjs` |

## Coding Style & Naming Conventions

- **TypeScript strict mode** enabled (`tsconfig.json` — `"strict": true`).
- **Indentation**: 2 spaces (Next.js default).
- **File names**: kebab-case for pages/routes (`login/page.tsx`), PascalCase for components (`ThemeToggle.tsx`), camelCase for utilities (`session.ts`).
- **Imports**: use `@/` path alias; group React/next imports first, then local.
- **Linting**: ESLint via `next lint` (extends `eslint-config-next`).
- Run `npm run typecheck` before pushing — the build doesn't type-check by default.

## Testing Guidelines

- **Framework**: Node.js built-in `node:test` runner (no Jest/Vitest).
- **Location**: `tests/socket/*.test.mjs` — ESM test files that import compiled JS from `dist-test/`.
- **Workflow**: `npm run test:socket` recompiles source then runs tests.
- **Naming**: test cases describe behavior in plain English (e.g., `creates deterministic private channel signature`).
- All socket modules (`auth`, `channels`, `events`, `presence`, `sdk`) must have coverage.

## Commit & Pull Request Guidelines

- **Commit messages**: use conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- **PRs**: include a summary of changes, linked issue (if any), and screenshots for UI changes.
- Ensure `npm run typecheck` and `npm run lint` pass before requesting review.

## Demo Credentials

The app uses in-memory demo auth via `lib/auth/session.ts`:

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Admin  | admin@gateway.local    | password   |
| Viewer | viewer@gateway.local   | password   |

## Architecture Notes

- **Single server**: Next.js serves both frontend and API routes — no separate backend.
- **Middleware** (`middleware.ts`): guards `/login` and `/docs` as public; all other routes require a valid `gateway_session` cookie.
- **WebSocket SDK** (`lib/socket/`): provides channel subscription, presence tracking, event deduplication, and auth signatures. Designed for browser consumption via the `Sdk` class.

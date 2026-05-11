# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Do not open a public issue.** Instead, please report security vulnerabilities by opening a private advisory on GitHub: https://github.com/sanhaji182/gateway_realtime/security/advisories/new

We take all security reports seriously. You can expect:

- Acknowledgment within 48 hours
- Status update within 5 business days
- Credit in the release notes (unless you prefer to remain anonymous)

## Security Model

Gateway Realtime uses:

- **JWT HMAC-SHA256** for WebSocket authentication
- **HMAC-SHA256** signatures for REST API publish requests
- **Redis ACL** support (configure via `REDIS_URL`)
- **Cookie-based session** for dashboard (demo auth — replace for production)

We recommend deploying behind a reverse proxy (nginx / Caddy) with TLS termination.

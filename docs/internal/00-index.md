# Dashboard Implementation – File Index

Total: 12 file implementasi siap pakai untuk Cursor Agent.

---

## Batch A – UI Foundation & Pages
Kasih ke Cursor satu per satu, mulai dari 00.

| File | Isi | Prioritas |
|------|-----|-----------|
| 00-foundation.md | Design tokens, base components, layout shell, anti-slop rules | P0 – Pertama |
| 01-page-overview.md | Halaman Overview: KPI, chart, health, tables | P1 |
| 02-page-apps.md | Apps list + App detail | P1 |
| 03-page-connections.md | Active connections, detail drawer | P1 |
| 04-page-events.md | Event explorer, payload viewer | P1 |
| 05-page-webhooks.md | Webhook monitor, retry | P1 |
| 06-page-settings.md | Settings form, tabbed | P2 |

## Batch B – Functional Layer
Kasih setelah UI halaman pertama jalan.

| File | Isi | Prioritas |
|------|-----|-----------|
| 07-api-spec.md | Semua REST API endpoint, request/response shape | P1 |
| 08-auth-routing.md | Login page, middleware, session, route structure | P1 |
| 09-realtime-frontend.md | SWR polling, SSE alert, time range context, drawer state | P2 |

## Batch C – Docs & Completeness
Kasih terakhir setelah dashboard fungsional.

| File | Isi | Prioritas |
|------|-----|-----------|
| 10-docs-portal.md | Layout docs portal, komponen MDX | P3 |
| 11-docs-content.md | Semua konten docs: quick start, auth, SDK, webhook, API ref | P3 |
| 12-missing-pages.md | 404, error boundary, loading skeletons, responsive, theme toggle, dependencies | P2 |

---

## Urutan Pengerjaan yang Disarankan

1. `00-foundation.md` → setup project, install deps, buat base components
2. `08-auth-routing.md` → login page + middleware dulu agar bisa test di browser
3. `07-api-spec.md` → mock API atau koneksi ke Go server
4. `01-page-overview.md` → halaman pertama
5. `02` → `03` → `04` → `05` → `06` secara berurutan
6. `09-realtime-frontend.md` → tambah live update
7. `12-missing-pages.md` → 404, skeleton, responsive
8. `10` → `11` → docs portal terakhir

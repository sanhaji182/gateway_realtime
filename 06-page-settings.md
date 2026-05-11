# 06 – Page: Settings

## File
`app/(dashboard)/settings/page.tsx`

## Layout
```
[TopBar: tanpa TimeRangeSelector]
[Page title: "Settings"]
[Tab Nav: General | Security | Rate Limits | Retention | Admin Users | Environment]
[Form Panel (max-width 720px)]
[Sticky Save Bar (bottom)]
```

## Tab Navigation
- Horizontal tab bar di bawah page title.
- Active tab: border-bottom accent, text-primary.
- Inactive: text-muted.
- URL mengikuti tab: /settings?tab=security.

---

## Tab: General
Fields:
- Display Name (text input) — nama gateway untuk UI.
- Base URL (text input) — base URL publik/internal gateway.
- Environment Label (select: production / staging / development).
- Support Email (text input, opsional).

---

## Tab: Security
Fields:
- JWT Secret (password input, reveal toggle).
- Allowed CORS Mode (select: strict / permissive).
- Token Expiry (number input, satuan menit).
- IP Whitelist (textarea, satu IP/CIDR per baris, opsional).

Warning box (kuning) bila JWT Secret belum pernah di-set.

---

## Tab: Rate Limits
Fields:
- Max Reconnects per IP (number, default 10/min).
- Max Publish per App per Second (number, default 100).
- Max Connections per App (number, 0 = unlimited).

---

## Tab: Retention
Fields:
- Event Log Retention (select: 1h / 6h / 24h / 7d / 30d).
- Webhook Log Retention (select: sama).
- Connection Log Retention (select: sama).

Info box (biru): "Longer retention increases storage usage."

---

## Tab: Admin Users
- Tabel admin user: name, email, role, last login, actions.
- Tombol "Invite Admin" di kanan atas.
- Role: owner / admin / viewer.
- Tidak ada role-based access di V1, cukup list dan tambah/hapus user.

---

## Tab: Environment
Read-only information panel:
- Gateway version.
- Go version.
- Redis version + connection status.
- Uptime.
- Build commit hash (mono).

---

## Sticky Save Bar
Muncul di bawah halaman saat ada perubahan yang belum disimpan.
```
[Unsaved changes will be lost on navigate.]   [Discard]  [Save Changes]
```
- Save Changes: warna accent.
- Discard: text button, warna muted.
- Muncul/hilang dengan smooth transition.

## Validation
- Field wajib diberi error state inline (border merah + pesan di bawah field).
- Tidak ada browser-native alert.
- Submit tidak diizinkan bila ada error.

## Data Fetching
```ts
const { data: settings } = useSWR('/api/settings')
// PATCH /api/settings on save
```

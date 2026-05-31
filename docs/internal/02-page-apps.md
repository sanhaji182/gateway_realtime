# 02 – Page: Apps + App Detail

## Files
- `app/(dashboard)/apps/page.tsx` — daftar apps
- `app/(dashboard)/apps/[id]/page.tsx` — detail app

---

## Apps List Page

### Layout
```
[TopBar]
[Page title: "Applications" + button "New App" kanan]
[FilterBar: search, status filter, sort]
[DataTable: app list]
```

### DataTable: App List
Gunakan TanStack Table. Kolom:

| Kolom         | Lebar | Tipe    | Notes                          |
|---------------|-------|---------|--------------------------------|
| App Name      | 220px | text    | Bold, link ke detail           |
| App ID        | 140px | mono    | font monospace, muted          |
| Status        | 90px  | badge   | active / inactive              |
| Connections   | 80px  | number  | live count                     |
| Events Today  | 100px | number  | formatted dengan separator     |
| Webhook       | 80px  | badge   | ok / warn / error / off        |
| Updated       | 100px | reltime | "2m ago", "1h ago"             |
| Actions       | 56px  | menu    | dropdown: Edit, Rotate, Disable|

- Klik row → navigasi ke `/apps/[id]`.
- Klik actions (···) → dropdown menu.
- Sort by name, status, connections, events (klik header kolom).
- Search by name atau app_id.
- Filter by status: all / active / inactive.
- Pagination: 20 per halaman.

### New App Modal
Buka sebagai dialog, bukan halaman baru.
Fields: Display Name, Environment (production/staging/dev).
Submit → POST /api/apps → refresh table → tampilkan toast success.

---

## App Detail Page

### Layout
```
[TopBar: breadcrumb "Apps / marketplace"]
[App Header: nama + badge status + app_id + action buttons]
─────────────────────────────────────────────────────────
[Left col 35%]         [Right col 65%]
 Credentials panel      Traffic Chart (24h)
 Allowed Origins        Peak Connections | Top Channels
 Webhook Endpoints      Recent Events Table
```

### App Header
- App name sebagai heading.
- StatusBadge (active/inactive) di samping nama.
- App ID kecil di sebelah badge, font mono, muted.
- Action buttons kanan: Edit | Rotate Secret | Disable.
  - Edit: buka drawer form edit nama.
  - Rotate Secret: buka ConfirmDialog dengan warning "Existing connections using old secret will be rejected."
  - Disable: buka ConfirmDialog merah.

### Left Col – Credentials Panel
- App ID, Key (read-only).
- Secret: defaultnya hidden (••••••••), tombol "Reveal" kecil di kanan.
- Reveal secret wajib tombol eksplisit, bukan auto-show.
- Copy button (Lucide `Copy` icon) untuk masing-masing field.

### Left Col – Allowed Origins
- List domain yang diizinkan.
- Tiap item: domain text + tombol × (hapus).
- Form tambah domain inline (input + add button).
- Validasi format URL sederhana sebelum submit.

### Left Col – Webhook Endpoints
- List endpoint URL + event filter + status badge.
- Klik endpoint → buka drawer konfigurasi webhook.
- Tambah endpoint: inline form atau drawer baru.

### Right Col – Traffic Chart
- AreaChart events/minute 24 jam terakhir.
- Warna teal.
- Time markers di X-axis: 00:00, 06:00, 12:00, 18:00, now.

### Right Col – Stats
2 panel berdampingan:
- Peak Connections: angka besar + waktu peak.
- Top Channels: ranked list channel berdasarkan event count.

### Right Col – Recent Events Table
5–10 event terbaru untuk app ini.
Kolom: Time | Channel | Event | Status.
Klik "View all" → /events?app_id=[id].

## Data Fetching
```ts
const { data: app }    = useSWR(`/api/apps/${id}`)
const { data: traffic } = useSWR(`/api/apps/${id}/stats`)
const { data: events }  = useSWR(`/api/apps/${id}/events?limit=10`)
```

# 01 – Page: Overview

## File
`app/(dashboard)/overview/page.tsx`

## Layout
```
[TopBar]
[Page title: "Overview"]
[KPI Row: 4 cards]
[Traffic Chart | System Health Panel]
[Recent Events Table | Webhook Failures Table]
```

## Section: KPI Row
4 KPICard dalam satu baris. Grid 4 kolom, gap 16px.

| Label              | Value  | Color   | Delta         |
|--------------------|--------|---------|---------------|
| Active Connections | 1,284  | accent  | ↑12 vs 1h ago |
| Events / min       | 342    | teal    | stable        |
| Webhook OK         | 99.1%  | success | ↓0.2%         |
| Error Rate         | 0.3%   | warning | ↑0.1%         |

Klik KPI card navigasi ke halaman relevan dengan filter preset:
- Active Connections → /connections
- Error Rate → /events?status=error

## Section: Traffic Chart
Komponen: Recharts `AreaChart`.
- Data: events/minute untuk range waktu yang dipilih.
- Single area line, warna accent, fill transparan 8%.
- X-axis: timestamp. Y-axis: jumlah event.
- Time range picker di header panel: 30m / 1h / 24h.
- Panel background `bg-surface2`, border `border`.
- Tidak ada legend kecuali bila multi-series di masa depan.

```tsx
<TrafficChart data={trafficData} range={timeRange} />
```

## Section: System Health Panel
Tampilkan status 3 komponen: Gateway, Broker, Webhook Worker.

Tiap item:
- Row dengan background `bg-surface3`.
- Nama komponen (kiri) + detail kecil (muted) di bawah nama.
- StatusBadge (kanan): Operational / Degraded / Down.

Bila ada komponen degraded/down, tampilkan alert banner kuning/merah di atas seluruh halaman.

```tsx
<HealthPanel items={[
  { name: "Gateway",        detail: "0 errors in last 1h",  status: "operational" },
  { name: "Broker (Redis)", detail: "latency 1ms",          status: "operational" },
  { name: "Webhook Worker", detail: "3 retries pending",    status: "degraded"    },
]} />
```

## Section: Recent Events Table
Tabel ringkas (non-paginated), tampil 10 baris terbaru.
Kolom: Timestamp | App | Channel | Event | Status

Klik row → buka DetailDrawer event (lihat 04-page-events.md).
Link "View all" → /events.

## Section: Webhook Failures Table
Tabel ringkas, tampil 10 failures terbaru.
Kolom: Timestamp | App | Event | HTTP Code | Attempt

Klik row → buka DetailDrawer webhook (lihat 05-page-webhooks.md).
Link "View all" → /webhooks?status=failed.

## Data Fetching
```ts
// Auto-refresh setiap 15 detik
const { data } = useSWR('/api/overview', fetcher, { refreshInterval: 15000 })
```

## Empty / Error States
- Bila semua komponen healthy dan belum ada event: tampilkan EmptyState di tabel.
- Bila fetch gagal: tampilkan inline error di tiap panel, bukan redirect.

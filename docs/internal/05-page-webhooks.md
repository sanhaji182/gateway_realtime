# 05 – Page: Webhooks

## File
`app/(dashboard)/webhooks/page.tsx`

## Layout
```
[TopBar: dengan TimeRangeSelector]
[Page title: "Webhook Monitor"]
[KPI Mini Row: 4 stats]
[FilterBar]
[DataTable: deliveries | DetailDrawer (slide kanan)]
```

## KPI Mini Row
4 card kecil (lebih compact dari Overview KPICard).

| Label            | Value  | Color   |
|------------------|--------|---------|
| Success Rate     | 97.4%  | success |
| Avg Latency      | 182ms  | teal    |
| Failed           | 14     | error   |
| Retrying         | 3      | warning |

Klik Failed → filter status=failed otomatis.
Klik Retrying → filter status=retrying.

## FilterBar
- Search: placeholder "Search endpoint URL, event name…"
- Filter App: dropdown.
- Filter Endpoint: text input.
- Filter Status: All / success / failed / retrying.
- Time Range: inherited dari TopBar.

## DataTable: Webhook Deliveries
Kolom:

| Kolom       | Lebar | Tipe    | Notes                              |
|-------------|-------|---------|------------------------------------|
| Timestamp   | 120px | mono    | HH:mm:ss.SSS                       |
| App         | 90px  | text    |                                    |
| Endpoint    | 170px | mono    | Truncated, full di drawer          |
| Event       | 130px | text    |                                    |
| Status      | 80px  | badge   | success / failed / retrying        |
| HTTP Code   | 70px  | text    | 200 = success color, 4xx/5xx = error|
| Latency     | 80px  | text    | ms, atau "timeout"                 |
| Attempt     | 70px  | number  | Badge warning bila > 1             |

- Status failed dan retrying harus mudah discan.
- Klik row → buka DetailDrawer.
- Row dengan status failed → bisa di-retry dari action column atau drawer.

## DetailDrawer: Webhook Delivery
Header: `[app]  →  [event name]`
Subheader: StatusBadge + "N attempts"

Tabs: Request | Response | Error (bila ada)

**Tab Request:**
- Method + URL (mono).
- Headers ringkas (Content-Type, X-Gateway-Signature).
- Request body (JSON viewer).

**Tab Response:**
- HTTP status code + status text.
- Response body ringkas (max 2KB ditampilkan, sisanya truncated).
- Latency.

**Tab Error (bila failed):**
- Error message lengkap.
- Stack trace bila tersedia.
- Retry history (timestamp per attempt).

**Footer actions:**
- Tombol "Retry Now" (warna warning) bila status failed/retrying.
- Konfirmasi tidak diperlukan untuk retry.

## Empty State
- Icon `Webhook`.
- Title: "No webhook deliveries found"
- Description: "Try adjusting your filters or check webhook configuration in app settings."

## Data Fetching
```ts
const { data } = useSWR(`/api/webhooks/logs?${queryString}`, fetcher, { refreshInterval: 15000 })
```

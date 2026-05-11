# 04 – Page: Events

## File
`app/(dashboard)/events/page.tsx`

## Layout
```
[TopBar: dengan TimeRangeSelector]
[Page title: "Event Explorer"]
[FilterBar]
[DataTable: events | DetailDrawer (slide kanan)]
```

## FilterBar
- Search: placeholder "Search channel, event name, request ID…"
- Filter App: dropdown.
- Filter Channel: text input.
- Filter Event: text input.
- Filter Status: All / ok / error.
- Time Range: inherited dari TopBar.

## DataTable: Events
Gunakan TanStack Table + virtual rows untuk performa.

Kolom:

| Kolom      | Lebar | Tipe | Notes                            |
|------------|-------|------|----------------------------------|
| Timestamp  | 120px | mono | HH:mm:ss.SSS format              |
| App        | 100px | text |                                  |
| Channel    | 150px | text | Accent color, klik = add filter  |
| Event      | 150px | text | Klik = add filter                |
| Source     | 80px  | text | ci4-api, go-svc, dll             |
| Size       | 60px  | text | "312 B", "1.2 KB"                |
| Status     | 80px  | badge| ok / error                       |
| Request ID | 120px | mono | Truncated                        |

- Klik channel atau event name → tambahkan ke filter.
- Klik row → buka DetailDrawer.
- Pagination: 50 per halaman atau infinite scroll.

## DetailDrawer: Event
Header: `[channel]  →  [event name]`
Subheader: `[app]  ·  [timestamp penuh]`

Tabs: Payload | Delivery | Raw

**Tab Payload:**
- JSON viewer dengan syntax highlight.
- Indent konsisten (2 spasi).
- Copy button di pojok kanan atas.
- Font monospace, ukuran 13px.
- Background sedikit lebih gelap dari drawer.

```json
{
  "order_id": 123,
  "status": "paid",
  "amount": 150000,
  "currency": "IDR",
  "buyer_id": "u-881"
}
```

**Tab Delivery:**
- Delivered to: jumlah subscriber yang menerima.
- Delivery latency: ms.
- Webhook triggered: ya/tidak, dengan link ke log webhook.

**Tab Raw:**
- Full raw JSON termasuk metadata internal.
- Hanya untuk debugging.

## Empty State
- Icon `Inbox`.
- Title: "No events in this range"
- Description: "Try adjusting your filters or time range."

## Data Fetching
```ts
const { data } = useSWR(
  `/api/events?${queryString}`,
  fetcher,
  { refreshInterval: timeRange === "30m" ? 10000 : 30000 }
)
```

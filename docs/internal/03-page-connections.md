# 03 – Page: Connections

## File
`app/(dashboard)/connections/page.tsx`

## Layout
```
[TopBar]
[Page title: "Connections" + live badge "● LIVE"]
[FilterBar]
[DataTable: connections | DetailDrawer (slide kanan)]
```

## Live Indicator
Badge kecil "● LIVE" di samping judul menunjukkan data auto-refresh.
Auto-refresh: setiap 5 detik.

## FilterBar
- Search: placeholder "Search socket ID, user ID, IP…"
- Filter App: dropdown semua app aktif.
- Filter State: All / Connected / Idle.
- Filter Channel: text input channel name.

## DataTable: Connections
Kolom:

| Kolom       | Lebar | Tipe    | Notes                          |
|-------------|-------|---------|--------------------------------|
| Socket ID   | 130px | mono    | Truncated, full di drawer      |
| App         | 100px | text    | Nama app                       |
| User ID     | 90px  | mono    | Optional, "-" bila anonymous   |
| IP          | 100px | mono    | IPv4/IPv6                      |
| Channels    | 70px  | number  | Jumlah channel yang di-sub     |
| Connected   | 100px | reltime | "10:22:01" atau "2m ago"       |
| Last Seen   | 90px  | reltime | "just now", "5s ago"           |
| State       | 80px  | badge   | live / idle / disconnecting    |

- Klik row → buka DetailDrawer.
- State badge: live = success, idle = warning.
- Pagination atau virtualisasi untuk list besar.

## DetailDrawer: Connection
Tabs: Info | Channels | Activity

**Tab Info:**
- Socket ID (mono, full, copy button).
- App, User ID, IP, User Agent.
- Connected at (timestamp penuh).
- Last seen (timestamp penuh).
- State badge.

**Tab Channels:**
- List semua channel yang sedang di-subscribe.
- Tiap item: nama channel, joined at.

**Tab Activity:**
- 5 event terakhir yang diterima koneksi ini.
- Kolom: timestamp, event name, channel.

**Action:**
- Tombol "Disconnect" (warna error) di footer drawer.
- Buka ConfirmDialog sebelum eksekusi.
- Hanya tersedia bila state = live.

## Empty State
Bila tidak ada koneksi aktif:
- Icon `WifiOff` besar.
- Title: "No active connections"
- Description: "Connections will appear here once clients connect to the gateway."

## Data Fetching
```ts
const { data } = useSWR('/api/connections', fetcher, { refreshInterval: 5000 })
```

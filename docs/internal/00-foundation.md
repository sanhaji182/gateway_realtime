# 00 – Foundation

## Context
Kamu adalah frontend engineer yang membangun dashboard internal self-hosted realtime event gateway, mirip Pusher tapi untuk penggunaan tim sendiri. Stack: Next.js, Tailwind CSS dengan custom design tokens, shadcn/ui sebagai base (wajib dikustom, jangan pakai default), Lucide icons, TanStack Table, Recharts.

## Design Direction
- Dark mode default, light mode tersedia via toggle.
- Gaya visual: modern, clean, data-dense, seperti Vercel/Linear/Grafana.
- Bukan template SaaS generik. Tidak ada gradient ungu-biru, hero section, ikon dalam lingkaran, card grid seragam.
- Warna hanya untuk status dan signal penting.
- Layout mengikuti alur kerja operator: lihat kondisi → filter masalah → buka detail → ambil tindakan.

## Design Tokens (globals.css)
```css
:root {
  --bg-canvas:   #F6F8FB;
  --bg-surface1: #FFFFFF;
  --bg-surface2: #F8FAFC;
  --bg-surface3: #EEF2F7;
  --border:      rgba(15,23,42,0.08);
  --text-primary:   #0F172A;
  --text-secondary: #475569;
  --text-muted:     #64748B;
  --accent:   #2563EB;
  --teal:     #0F766E;
  --success:  #16A34A;
  --warning:  #D97706;
  --error:    #DC2626;
  --info:     #0284C7;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}

.dark {
  --bg-canvas:   #0B0F14;
  --bg-surface1: #10161D;
  --bg-surface2: #151C24;
  --bg-surface3: #1B2430;
  --border:      rgba(255,255,255,0.08);
  --text-primary:   #E6EDF3;
  --text-secondary: #9FB0C0;
  --text-muted:     #738496;
  --accent:   #3AA0FF;
  --teal:     #22C3A6;
  --success:  #22C55E;
  --warning:  #F59E0B;
  --error:    #EF4444;
  --info:     #38BDF8;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

## Typography
```css
body { font-family: 'Inter', 'Geist', system-ui, sans-serif; font-size: 14px; }
code, pre, .mono { font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace; }
.page-title   { font-size: 22px; font-weight: 600; }
.section-title { font-size: 16px; font-weight: 600; }
.card-title   { font-size: 13px; font-weight: 600; }
.label        { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
```

## Global Shell
```
+--248px--+-------------------content-------------------+
| sidebar |  top bar (64px sticky)                       |
|         +----------------------------------------------+
|         |  page content (scroll)                       |
|         |                                              |
+---------+----------------------------------------------+
```

### Sidebar (components/Sidebar.tsx)
- Lebar 248px, fixed.
- Background: `bg-surface1`.
- Logo + product name di atas.
- Nav items: Overview, Apps, Connections, Events, Webhooks, Settings.
- Active state: `bg-surface3` + `text-primary`. Inactive: `text-muted`.
- Ikon Lucide kecil (16px) di sebelah label. Tidak ada lingkaran warna di belakang ikon.
- System status ringkas di bagian bawah sidebar (dot hijau/kuning/merah + label).
- Tidak ada badge angka notifikasi.

```tsx
// Nav item structure
<nav>
  <NavItem href="/overview" icon={LayoutDashboard} label="Overview" active />
  <NavItem href="/apps"     icon={Boxes}           label="Apps" />
  <NavItem href="/connections" icon={Radio}        label="Connections" />
  <NavItem href="/events"   icon={Zap}             label="Events" />
  <NavItem href="/webhooks" icon={Webhook}         label="Webhooks" />
  <NavItem href="/settings" icon={Settings}        label="Settings" />
</nav>
```

### Top Bar (components/TopBar.tsx)
- Height 64px, sticky, `bg-surface1`, border-bottom `border`.
- Kiri: breadcrumb atau page title.
- Kanan: TimeRangeSelector + ThemeToggle + UserMenu.
- TimeRangeSelector hanya muncul di halaman observability (Overview, Events, Webhooks, Connections).

## Base Components

### StatusBadge (components/ui/StatusBadge.tsx)
Varian: `success` | `warning` | `error` | `info` | `neutral`
- Background: warna transparan 12% opacity.
- Border: 1px solid warna penuh.
- Text: warna penuh.
- Tidak ada solid fill penuh, tidak ada border-radius > 6px.

```tsx
<StatusBadge variant="success">Operational</StatusBadge>
<StatusBadge variant="error">Failed</StatusBadge>
<StatusBadge variant="warning">Degraded</StatusBadge>
```

### KPICard (components/ui/KPICard.tsx)
- Background: `bg-surface2`.
- Label kecil (uppercase, muted) di atas.
- Nilai utama besar (24px semibold) di tengah dengan warna aksen.
- Subtext delta kecil (muted) di bawah.
- Tidak ada ikon dalam lingkaran. Ikon kecil optional di kanan atas.
- Tidak ada shadow dramatis.

```tsx
<KPICard label="Active Connections" value="1,284" delta="+12 vs 1h ago" color="accent" />
<KPICard label="Error Rate"         value="0.3%"  delta="↑ 0.1%"       color="warning" />
```

### DataTable (components/ui/DataTable.tsx)
- Gunakan TanStack Table.
- Header sticky saat scroll.
- Zebra rows: row genap dengan background `rgba(255,255,255,0.02)`.
- Hover row: `rgba(255,255,255,0.04)`.
- Row height 40px.
- Klik row → buka DetailDrawer.
- Kolom teknis (ID, IP, hash) pakai font mono.
- Truncate + ellipsis untuk teks panjang, tooltip on hover.

### FilterBar (components/ui/FilterBar.tsx)
- Sticky di bawah TopBar saat scroll.
- Horizontal layout: search input + dropdown filters + date range + reset.
- Filter aktif ditandai dengan border warna aksen.
- Reset button muncul hanya saat ada filter aktif.

### DetailDrawer (components/ui/DetailDrawer.tsx)
- Slide dari kanan, lebar 440–520px.
- Overlay semi-transparan di belakangnya.
- Header: judul + close button.
- Konten: metadata list + tab panel (bila ada multiple views).
- Copy to clipboard untuk field teknis.
- Close via Escape, close button, atau klik overlay.

### EmptyState (components/ui/EmptyState.tsx)
- Judul jelas, deskripsi 1 kalimat, CTA.
- Tidak ada teks "No data found." saja.
- Ilustrasi ringan via Lucide icon besar (40px, muted).

```tsx
<EmptyState
  icon={Inbox}
  title="No events yet"
  description="Events will appear here once your app starts publishing."
  action={<Button>View docs</Button>}
/>
```

### SkeletonRow (components/ui/SkeletonRow.tsx)
- Gunakan untuk loading state tabel.
- Skeleton harus mencerminkan jumlah kolom dan lebar tabel asli.
- Animasi pulse ringan.
- Tidak pakai spinner fullscreen.

### ConfirmDialog (components/ui/ConfirmDialog.tsx)
- Dipakai untuk aksi destruktif: rotate secret, disable app, disconnect socket.
- Teks warning jelas.
- Tombol konfirmasi menggunakan warna `error`.

### Toast (components/ui/Toast.tsx)
- Posisi bottom-right.
- Varian: success, error, warning, info.
- Auto-dismiss 4 detik.
- Tidak ada toast yang muncul untuk setiap aksi kecil.

## Anti-slop Rules (wajib diikuti)
- Tidak ada gradient pada background maupun tombol.
- Tidak ada ikon dalam lingkaran/kotak berwarna sebagai dekorasi.
- Tidak ada card grid 3 kolom yang isinya identik semua.
- Tidak ada hero section atau welcome banner di halaman dalam.
- Tidak ada copy generik: "Welcome back", "Manage everything in one place".
- Tidak ada colored border-left pada card.
- Tidak ada glassmorphism, blur, atau glow.
- Border-radius konsisten, tidak ada elemen dengan radius >16px kecuali modal/drawer.
- Semua page title rata kiri.
- Warna hanya untuk status: success, warning, error, info. Bukan untuk estetika.

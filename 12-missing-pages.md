# 12 – Missing Pages & States

## 1. Login Page

File: `app/(auth)/login/page.tsx`
(Spec lengkap di `08-auth-routing.md`)

Tambahkan ThemeToggle di pojok kanan atas login page agar user bisa ganti tema sebelum login.

---

## 2. 404 Page

File: `app/not-found.tsx`

### Layout
```
[Center halaman, tidak ada sidebar]
  404
  "Page not found"
  "The page you're looking for doesn't exist or has been moved."
  [button: Back to Overview]
```

### Rules
- Tidak ada ilustrasi animasi berlebihan.
- Kode `404` ditampilkan sebagai heading besar, font mono, warna muted.
- Tombol CTA satu: Back to Overview (accent).
- Background sama seperti halaman biasa (bukan full-screen gelap berbeda).

```tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <span className="font-mono text-7xl font-bold text-muted">404</span>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-secondary text-sm">The page you're looking for doesn't exist.</p>
      <Link href="/overview"><Button>Back to Overview</Button></Link>
    </div>
  )
}
```

---

## 3. Error Boundary

File: `app/error.tsx` dan `components/ErrorBoundary.tsx`

### Global Error Page (app/error.tsx)
Ditampilkan bila ada runtime error di halaman.

```tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <span className="font-mono text-5xl font-bold text-error">Error</span>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-secondary text-sm max-w-sm text-center">{error.message}</p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  )
}
```

### Inline Error (untuk fetch error di panel)
Jangan redirect ke halaman error untuk fetch failure. Tampilkan inline di panel:

```tsx
function PanelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-secondary">
      <AlertCircle className="w-8 h-8 text-error" />
      <p className="text-sm">Failed to load data.</p>
      <button onClick={onRetry} className="text-accent text-sm underline">Retry</button>
    </div>
  )
}
```

---

## 4. Loading States per Halaman

### Overview
- KPI row: 4 SkeletonCard (lebar dan tinggi sama dengan KPICard).
- Traffic chart panel: skeleton rect placeholder.
- Tables: 5 SkeletonRow per tabel.

### Apps List
- Table: 8 SkeletonRow.
- Masing-masing row mencerminkan lebar kolom asli.

### App Detail
- Left col: SkeletonBlock per section (credentials, origins, webhooks).
- Right col: SkeletonChart untuk traffic area, 3 SkeletonRow untuk event table.

### Connections / Events / Webhooks
- 10 SkeletonRow di table.
- FilterBar tidak di-skeleton (tetap interaktif).

### Settings
- Form fields: SkeletonInput per field.

### Skeleton Components
```tsx
// Dipakai di semua loading state
<SkeletonCard />          // untuk KPICard
<SkeletonRow cols={8} />  // untuk tabel, jumlah kolom sesuai halaman
<SkeletonChart />         // untuk area chart
<SkeletonInput />         // untuk form field
<SkeletonBlock h={80} />  // untuk block konten bebas
```

Semua skeleton menggunakan animasi `animate-pulse` dari Tailwind.
Background: `bg-surface3`. Jangan gunakan warna berbeda.

---

## 5. Responsive (Tablet & Mobile)

Dashboard ini utamanya desktop. Untuk tablet dan mobile, cukup:

| Breakpoint | Behavior                                      |
|------------|-----------------------------------------------|
| < 768px    | Sidebar collapsed (icon only atau hamburger)  |
| 768–1024px | Sidebar tetap, konten menyesuaikan            |
| > 1024px   | Full layout seperti spec                      |

### Mobile Sidebar
Pada < 768px:
- Sidebar tersembunyi secara default.
- Hamburger icon di TopBar untuk toggle.
- Sidebar muncul sebagai overlay penuh dengan backdrop.
- Close via swipe kiri atau tombol ×.

### Table pada Mobile
Tabel tidak bisa di-scroll horizontal dengan baik di mobile.
Solusi V1: tampilkan versi card-list untuk halaman yang sering dipakai di mobile (Apps).
Untuk halaman teknis (Connections, Events, Webhooks) — cukup horizontal scroll.

---

## 6. Theme Toggle

### ThemeProvider (components/ThemeProvider.tsx)
```tsx
'use client'
import { ThemeProvider as NextThemes } from 'next-themes'

export function ThemeProvider({ children }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemes>
  )
}
```

### ThemeToggle (components/ui/ThemeToggle.tsx)
```tsx
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="icon-btn" aria-label="Toggle theme">
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
```

---

## 7. Dependencies Lengkap (package.json)

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "next-themes": "^0.3",
    "swr": "^2",
    "recharts": "^2",
    "@tanstack/react-table": "^8",
    "lucide-react": "^0.400",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "date-fns": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "@types/react": "^18"
  }
}
```

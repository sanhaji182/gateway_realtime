# 09 – Real-time Frontend (Dashboard Live Updates)

## Konteks
Dashboard perlu menampilkan data live tanpa user harus refresh manual:
- Halaman Connections: koneksi aktif berubah setiap detik.
- Halaman Overview: KPI dan event terbaru update setiap beberapa detik.
- Halaman Events: event baru masuk saat page terbuka.
- System health: alert bila komponen down.

## Strategi
Gunakan kombinasi dua mekanisme:

| Halaman      | Mekanisme        | Interval |
|--------------|------------------|----------|
| Overview     | SWR polling      | 15 detik |
| Connections  | SWR polling      | 5 detik  |
| Events       | SWR polling      | 10 detik |
| Webhooks     | SWR polling      | 15 detik |
| System Alert | SSE (push)       | real-time|

SSE digunakan khusus untuk system alert agar tidak ada delay saat komponen down.
Tidak perlu WebSocket dari dashboard ke gateway — polling SWR sudah cukup untuk kebutuhan internal tool.

---

## SWR Setup (lib/swr.ts)

```ts
import useSWR from 'swr'

export const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error('Fetch failed')
    return res.json()
  })

// Global SWR config di providers.tsx
export const swrConfig = {
  fetcher,
  revalidateOnFocus: false,
  errorRetryCount: 3,
  dedupingInterval: 2000,
}
```

---

## Live Connection Count (Connections page)

```ts
// hooks/useConnections.ts
export function useConnections(filters) {
  const query = new URLSearchParams(filters).toString()
  const { data, error, isLoading } = useSWR(
    `/api/connections?${query}`,
    fetcher,
    { refreshInterval: 5000 }
  )
  return { connections: data?.data, meta: data?.meta, error, isLoading }
}
```

Live indicator: tampilkan badge "● LIVE" yang berkedip halus saat refreshInterval aktif.

```tsx
<span className="inline-flex items-center gap-1 text-xs text-success">
  <span className="animate-pulse">●</span> LIVE
</span>
```

---

## Optimistic Update (Disconnect & Retry)

Saat user klik "Disconnect" atau "Retry":
1. Tampilkan loading state di tombol.
2. Kirim request ke API.
3. Bila sukses: invalidate SWR cache → tabel auto-refresh.
4. Bila gagal: tampilkan toast error.

```ts
async function handleDisconnect(socketId: string) {
  setLoading(true)
  try {
    await fetch(`/api/connections/${socketId}`, { method: 'DELETE' })
    mutate('/api/connections')           // invalidate cache
    toast.success('Connection disconnected')
    drawer.close()
  } catch {
    toast.error('Failed to disconnect. Try again.')
  } finally {
    setLoading(false)
  }
}
```

---

## SSE – System Alert (hooks/useSystemAlert.ts)

```ts
export function useSystemAlert() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    const es = new EventSource('/api/stream/alerts')

    es.onmessage = (e) => {
      const alert = JSON.parse(e.data)
      setAlerts(prev => [alert, ...prev].slice(0, 5))
    }

    es.onerror = () => {
      // SSE auto-reconnect handled by browser
    }

    return () => es.close()
  }, [])

  return alerts
}
```

### Alert Banner (components/AlertBanner.tsx)
Tampil di bagian atas semua halaman dashboard bila ada alert aktif.
```tsx
{alerts.map(alert => (
  <div key={alert.id} className={`alert-banner alert-${alert.severity}`}>
    <span>{alert.message}</span>
    <button onClick={() => dismiss(alert.id)}>×</button>
  </div>
))}
```

Styling:
- `warning` → background `rgba(245,158,11,0.1)`, border-bottom warning.
- `error` → background `rgba(239,68,68,0.1)`, border-bottom error.
- Tidak ada fixed overlay yang memblok konten.

---

## Time Range Context (context/TimeRangeContext.tsx)

Time range dipilih di TopBar, dipakai oleh banyak halaman.

```ts
const TimeRangeContext = createContext<{
  range: '30m' | '1h' | '24h'
  setRange: (r: string) => void
}>({ range: '1h', setRange: () => {} })

export function TimeRangeProvider({ children }) {
  const [range, setRange] = useState<'30m' | '1h' | '24h'>('1h')
  return (
    <TimeRangeContext.Provider value={{ range, setRange }}>
      {children}
    </TimeRangeContext.Provider>
  )
}

export const useTimeRange = () => useContext(TimeRangeContext)
```

TimeRangeSelector di TopBar memanggil `setRange`, semua hook useSWR di halaman observability subscribe ke `range` ini.

---

## Drawer State (context/DrawerContext.tsx)

```ts
export function useDrawer<T>() {
  const [item, setItem] = useState<T | null>(null)
  const open = (i: T) => setItem(i)
  const close = () => setItem(null)
  return { item, isOpen: !!item, open, close }
}
```

Dipakai di semua halaman yang punya DetailDrawer.

---

## Provider Tree (app/providers.tsx)

```tsx
export function Providers({ children }) {
  return (
    <SWRConfig value={swrConfig}>
      <TimeRangeProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </TimeRangeProvider>
    </SWRConfig>
  )
}
```

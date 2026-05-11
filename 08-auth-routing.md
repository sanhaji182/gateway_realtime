# 08 – Auth, Routing & Middleware

## Stack
- Next.js App Router.
- Session disimpan di HttpOnly cookie (`gateway_session`).
- Tidak ada OAuth di V1 — hanya email + password.
- Token disimpan di cookie, bukan localStorage.

---

## Login Page

### File
`app/(auth)/login/page.tsx`

### Layout
```
[Center card: 400px lebar, vertikal center di halaman]
  Logo + product name
  Form: Email, Password
  Button: Sign In
  Error message (bila gagal)
```

### Rules
- Background: `bg-canvas` (bukan gelap penuh, sama seperti halaman lain).
- Card: `bg-surface1`, border, radius-md.
- Tidak ada ilustrasi, gradient, atau background dekoratif.
- Tidak ada "Forgot password" di V1.
- Loading state pada tombol saat submit.
- Error inline di bawah form (bukan toast).

### Form
```tsx
<form onSubmit={handleLogin}>
  <Input  type="email"    name="email"    label="Email"    required />
  <Input  type="password" name="password" label="Password" required />
  {error && <p className="text-error text-sm">{error}</p>}
  <Button type="submit" loading={isLoading} className="w-full">Sign In</Button>
</form>
```

### Logic
```ts
async function handleLogin(e) {
  e.preventDefault()
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) { setError('Email or password is incorrect'); return }
  router.push('/overview')
}
```

---

## Middleware (middleware.ts)

```ts
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login']

export function middleware(req: NextRequest) {
  const token = req.cookies.get('gateway_session')?.value
  const isPublic = PUBLIC_PATHS.some(p => req.nextUrl.pathname.startsWith(p))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (token && isPublic) {
    return NextResponse.redirect(new URL('/overview', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Route Structure

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx          ← AppShell (sidebar + topbar)
│   ├── overview/
│   │   └── page.tsx
│   ├── apps/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── connections/
│   │   └── page.tsx
│   ├── events/
│   │   └── page.tsx
│   ├── webhooks/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── docs/
│   └── [[...slug]]/
│       └── page.tsx
└── not-found.tsx
```

---

## Dashboard Layout (layout.tsx)

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## Session Handling

### useAuth hook (hooks/useAuth.ts)
```ts
export function useAuth() {
  const { data, error } = useSWR('/api/auth/me')
  return {
    user: data?.data,
    isLoading: !data && !error,
    isAuthenticated: !!data?.data,
  }
}
```

### Logout
```ts
async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  router.push('/login')
}
```

---

## Role Check (V1 sederhana)
Di V1 semua admin user punya akses penuh. Cukup check apakah user terautentikasi.
Role `viewer` hanya bisa membaca, tidak bisa: rotate secret, disable app, disconnect socket, retry webhook, ubah settings, hapus user.

```ts
function canEdit(user) { return user?.role !== 'viewer' }
```

Semua tombol aksi destruktif harus di-disable dan tooltip "Viewer access only" bila role viewer.

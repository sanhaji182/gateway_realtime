# 10 – Docs Portal

## Context
Halaman dokumentasi untuk developer yang ingin mengintegrasikan gateway ke aplikasi mereka. Terpisah dari dashboard (tidak perlu login), aksesible di `/docs`.

## File
`app/docs/[[...slug]]/page.tsx`

## Stack
- MDX untuk konten — setiap halaman docs adalah file `.mdx` di folder `content/docs/`.
- Syntax highlight: Shiki.
- Search: Algolia DocSearch (V1 bisa pakai search lokal dulu dengan Fuse.js).
- Tidak pakai Nextra atau Docusaurus — build sendiri agar tampilan konsisten dengan dashboard.

---

## Layout Docs

```
+--260px sidebar--+----------content 720px----------+--220px TOC--+
| Logo            |  [Breadcrumb]                    | On this page|
| Search          |  # Page Title                    | - Section 1 |
| Nav tree        |  content...                      | - Section 2 |
|                 |  [Prev / Next]                   |             |
+-----------------+----------------------------------+-------------+
```

### Docs Sidebar (components/docs/DocsSidebar.tsx)
- Lebar 260px, fixed.
- Logo + "Docs" label di atas.
- Search input (shortcut `⌘K` / `Ctrl+K`).
- Nav tree dengan section dan halaman:

```
Getting Started
  ├── Introduction
  ├── Quick Start
  └── Self-Hosting

Authentication
  └── API Keys & Secrets

Publishing Events
  ├── REST API
  └── PHP SDK (CI4)

Subscribing
  └── JavaScript SDK

Webhooks
  ├── Overview
  ├── Payload & Signature
  └── Retry Behavior

API Reference
  ├── Apps
  ├── Events
  ├── Connections
  └── Webhooks
```

- Active page: bg surface3, text primary.
- Collapse/expand per section.
- Tidak ada icon dekoratif.

### Docs Content Area
- Max-width 720px, center.
- Padding horizontal 32px.
- Typography rapi: heading, paragraph, code block, table, blockquote.
- Code block: background `bg-surface2`, border, copy button di pojok kanan atas.
- Tab code block untuk multi-bahasa (PHP / JS / curl).
- Callout box untuk warning dan info (bukan hanya blockquote).

```tsx
<Callout type="warning">
  Keep your App Secret private. Never expose it in frontend code.
</Callout>

<Callout type="info">
  Rate limit defaults to 100 events/second per app.
</Callout>
```

### Table of Contents (kanan)
- Sticky saat scroll.
- Highlight section yang sedang di-viewport.
- Hanya muncul di desktop (> 1280px).

### Prev / Next Navigation
Footer setiap halaman docs dengan link prev/next.

---

## Docs Page Components

### CodeBlock (components/docs/CodeBlock.tsx)
```tsx
<CodeBlock language="php" filename="NotifHelper.php">
{`$notif->send('orders.99', 'order.paid', ['order_id' => 123]);`}
</CodeBlock>
```
- Shiki untuk syntax highlight.
- Copy button: icon Lucide `Copy`, ganti jadi `Check` 2 detik.
- Filename ditampilkan sebagai tab di atas block.

### MultiCodeBlock (components/docs/MultiCodeBlock.tsx)
Tabs untuk beberapa bahasa:
```tsx
<MultiCodeBlock tabs={[
  { label: "PHP",  language: "php",  code: `...` },
  { label: "JS",   language: "js",   code: `...` },
  { label: "cURL", language: "bash", code: `...` },
]} />
```

### Callout (components/docs/Callout.tsx)
Varian: `info` | `warning` | `danger` | `tip`

### APIParam (components/docs/APIParam.tsx)
Untuk mendeskripsikan field request/response:
```tsx
<APIParam name="channel" type="string" required>
  Target channel name. Supports wildcards: orders.* or orders.#
</APIParam>
```

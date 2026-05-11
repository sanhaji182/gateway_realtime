import { APIParam } from "@/components/docs/APIParam";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import type { TocItem } from "@/components/docs/TableOfContents";

type DocsContent = {
  toc: TocItem[];
  render: () => React.ReactNode;
};

export const docsContent: Record<string, DocsContent> = {
  introduction: {
    toc: [{ id: "cara-kerja", title: "Cara kerja" }, { id: "kapan-pakai-ini", title: "Kapan pakai ini" }],
    render: () => <><p><strong>Internal Event Gateway</strong> adalah self-hosted realtime event system untuk aplikasi internal. Mirip Pusher, tapi berjalan di infrastruktur kamu sendiri.</p><h2 id="cara-kerja">Cara kerja</h2><ol><li>Backend kamu (CI4 / Golang / Node.js) publish event via REST API atau PHP SDK.</li><li>Gateway meneruskan event ke semua subscriber yang terhubung via WebSocket.</li><li>Frontend kamu (browser / mobile) menerima event secara realtime tanpa polling.</li></ol><h2 id="kapan-pakai-ini">Kapan pakai ini</h2><ul><li>Notifikasi order baru ke penjual secara realtime.</li><li>Update status pesanan tanpa refresh halaman.</li><li>Indikator &ldquo;sedang mengetik&rdquo; pada fitur chat.</li><li>Broadcast pengumuman dari admin.</li></ul></>
  },
  "quick-start": {
    toc: [{ id: "buat-app", title: "1. Buat App" }, { id: "publish-event", title: "2. Publish event" }, { id: "subscribe", title: "3. Subscribe" }, { id: "verifikasi", title: "4. Verifikasi" }],
    render: () => <><p>Panduan ini akan membuat kamu mengirim event pertama dalam &lt; 5 menit.</p><h2 id="buat-app">1. Buat App</h2><p>Login ke dashboard → <strong>Apps</strong> → <strong>New App</strong>. Catat <code>App ID</code>, <code>Key</code>, dan <code>Secret</code>.</p><h2 id="publish-event">2. Publish event (PHP / CI4)</h2><p>Install library:</p><CodeBlock language="bash">{`composer require your-org/gateway-php-sdk`}</CodeBlock><p>Publish event:</p><CodeBlock language="php" filename="OrderController.php">{`use Gateway\\Client;

$client = new Client(
    appId: 'app_a1b2c',
    key:   'pk_live_...',
    secret:'sk_live_...',
    host:  'https://gateway.internal'
);

$client->publish(
    channel: 'orders.99',
    event:   'order.paid',
    data:    ['order_id' => 99, 'amount' => 150000]
);`}</CodeBlock><h2 id="subscribe">3. Subscribe di frontend (JavaScript)</h2><CodeBlock language="html">{`<script src="https://gateway.internal/sdk/gateway.js"></script>
<script>
const gw = new GatewayClient({
  key:  'pk_live_...',
  host: 'wss://gateway.internal'
})

const channel = gw.subscribe('orders.99')

channel.on('order.paid', (data) => {
  console.log('Order paid:', data)
  showNotification(\`Order #\${data.order_id} sudah dibayar\`)
})
</script>`}</CodeBlock><h2 id="verifikasi">4. Verifikasi</h2><p>Buka dashboard → <strong>Events</strong>. Event <code>order.paid</code> harus muncul di tabel.</p></>
  },
  authentication: {
    toc: [{ id: "app-key-secret", title: "App Key & Secret" }, { id: "websocket-auth", title: "WebSocket Auth" }, { id: "rotate-secret", title: "Rotate Secret" }],
    render: () => <><h2 id="app-key-secret">App Key & Secret</h2><p>Setiap app punya dua credential:</p><table><thead><tr><th>Credential</th><th>Visibilitas</th><th>Dipakai untuk</th></tr></thead><tbody><tr><td>App Key</td><td>Public</td><td>Subscribe (frontend)</td></tr><tr><td>App Secret</td><td>Private</td><td>Publish (backend only)</td></tr></tbody></table><Callout type="warning">App Secret <strong>tidak boleh</strong> di-expose di frontend code atau git repository. Gunakan environment variable.</Callout><h2 id="websocket-auth">WebSocket Auth</h2><p>Saat koneksi dibuat, gateway memvalidasi App Key:</p><CodeBlock>{`wss://gateway.internal/app/pk_live_a1b2c?version=1`}</CodeBlock><p>Untuk private channel, kirim auth token saat subscribe:</p><CodeBlock language="js">{`const channel = gw.subscribe('private-orders.99', {
  auth: async () => {
    const res = await fetch('/api/gateway-auth', {
      method: 'POST',
      body: JSON.stringify({ socket_id: gw.socketId, channel: 'private-orders.99' })
    })
    return res.json() // { auth: "pk_live_...:sha256signature" }
  }
})`}</CodeBlock><h2 id="rotate-secret">Rotate Secret</h2><p>Bila secret bocor: Dashboard → Apps → [nama app] → <strong>Rotate Secret</strong>. Semua koneksi yang menggunakan secret lama akan ditolak saat reconnect.</p></>
  },
  "publishing-events": {
    toc: [{ id: "via-rest-api", title: "Via REST API" }, { id: "via-php-sdk", title: "Via PHP SDK" }, { id: "channel-naming", title: "Channel Naming" }, { id: "wildcard-subscribe", title: "Wildcard Subscribe" }],
    render: () => <><h2 id="via-rest-api">Via REST API</h2><CodeBlock language="bash">{`POST /api/v1/events/publish
Authorization: Bearer sk_live_...
Content-Type: application/json

{
  "app_id":  "app_a1b2c",
  "channel": "orders.99",
  "event":   "order.paid",
  "data":    { "order_id": 99, "amount": 150000 }
}`}</CodeBlock><p>Response:</p><CodeBlock language="json">{`{ "data": { "ok": true, "event_id": "evt_001", "subscribers": 3 } }`}</CodeBlock><h2 id="via-php-sdk">Via PHP SDK (CI4)</h2><CodeBlock language="php">{`// Di CI4 Controller atau Service
$notif = new \\Gateway\\Client(appId: env('GW_APP_ID'), ...);

// Di OrderController setelah payment confirmed
$notif->publish('orders.' . $order->id, 'order.paid', [
    'order_id' => $order->id,
    'buyer_id' => $order->buyer_id,
    'amount'   => $order->total,
]);`}</CodeBlock><h2 id="channel-naming">Channel Naming</h2><table><thead><tr><th>Pattern</th><th>Contoh</th><th>Keterangan</th></tr></thead><tbody><tr><td><code>name</code></td><td><code>users</code></td><td>Public channel global</td></tr><tr><td><code>name.id</code></td><td><code>orders.99</code></td><td>Channel per entity</td></tr><tr><td><code>private-*</code></td><td><code>private-inbox.5</code></td><td>Perlu auth saat subscribe</td></tr><tr><td><code>presence-*</code></td><td><code>presence-room.1</code></td><td>Expose online member list</td></tr></tbody></table><h2 id="wildcard-subscribe">Wildcard Subscribe</h2><CodeBlock language="js">{`// Subscribe semua event di orders.*
gw.subscribe('orders.*').on('*', handler)`}</CodeBlock></>
  },
  "javascript-sdk": {
    toc: [{ id: "install", title: "Install" }, { id: "connect", title: "Connect" }, { id: "subscribe-listen", title: "Subscribe & Listen" }, { id: "connection-events", title: "Connection Events" }, { id: "reconnect-behavior", title: "Reconnect Behavior" }],
    render: () => <><h2 id="install">Install</h2><CodeBlock language="html">{`<!-- Via CDN -->
<script src="https://gateway.internal/sdk/gateway.js"></script>

<!-- Via npm -->
npm install @internal/gateway-js`}</CodeBlock><h2 id="connect">Connect</h2><CodeBlock language="js">{`const gw = new GatewayClient({
  key:  'pk_live_...',
  host: 'wss://gateway.internal',
  // opsional:
  authEndpoint: '/api/gateway-auth',
  autoReconnect: true,
})`}</CodeBlock><h2 id="subscribe-listen">Subscribe & Listen</h2><CodeBlock language="js">{`// Public channel
const ch = gw.subscribe('orders.99')
ch.on('order.paid',    (data) => { /* ... */ })
ch.on('order.shipped', (data) => { /* ... */ })

// Unsubscribe
gw.unsubscribe('orders.99')`}</CodeBlock><h2 id="connection-events">Connection Events</h2><CodeBlock language="js">{`gw.on('connected',     ()    => console.log('WS connected'))
gw.on('disconnected',  ()    => console.log('WS disconnected'))
gw.on('reconnecting',  (n)   => console.log(\`Reconnect attempt \${n}\`))
gw.on('error',         (err) => console.error(err))`}</CodeBlock><h2 id="reconnect-behavior">Reconnect Behavior</h2><p>Auto-reconnect dengan exponential backoff: 1s → 2s → 4s → 8s → max 30s.</p></>
  },
  webhooks: {
    toc: [{ id: "overview", title: "Overview" }, { id: "konfigurasi", title: "Konfigurasi" }, { id: "payload", title: "Payload" }, { id: "verifikasi-signature", title: "Verifikasi Signature" }, { id: "retry-policy", title: "Retry Policy" }],
    render: () => <><h2 id="overview">Overview</h2><p>Webhook memungkinkan gateway mengirimkan HTTP request ke endpoint backend kamu setiap kali event tertentu dipublish.</p><p>Berguna untuk: logging, trigger background job, notifikasi antar service.</p><h2 id="konfigurasi">Konfigurasi</h2><p>Dashboard → Apps → [nama app] → <strong>Webhook Endpoints</strong> → tambah endpoint.</p><ul><li><strong>URL</strong>: endpoint yang akan di-POST.</li><li><strong>Events</strong>: filter event (<code>*</code> untuk semua, atau spesifik seperti <code>order.paid</code>).</li><li><strong>Secret</strong>: opsional, untuk verifikasi signature.</li></ul><h2 id="payload">Payload</h2><CodeBlock language="json">{`POST https://api.internal/hook
Content-Type: application/json
X-Gateway-Signature: sha256=abc123...
X-Gateway-Timestamp: 1746432001

{
  "event":   "order.paid",
  "channel": "orders.99",
  "app_id":  "app_a1b2c",
  "data":    { "order_id": 99 },
  "ts":      1746432001842
}`}</CodeBlock><h2 id="verifikasi-signature">Verifikasi Signature</h2><CodeBlock language="php">{`$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'];
$secret    = env('GW_WEBHOOK_SECRET');

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit;
}`}</CodeBlock><h2 id="retry-policy">Retry Policy</h2><table><thead><tr><th>Attempt</th><th>Delay</th></tr></thead><tbody><tr><td>1</td><td>Segera</td></tr><tr><td>2</td><td>30 detik</td></tr><tr><td>3</td><td>5 menit</td></tr><tr><td>4</td><td>30 menit</td></tr><tr><td>5</td><td>2 jam</td></tr></tbody></table><p>Setelah 5 kali gagal, delivery dianggap dead. Manual retry tersedia di dashboard.</p><p>Endpoint harus merespons dengan HTTP 2xx dalam 10 detik.</p></>
  },
  "api-reference": {
    toc: [{ id: "publish-event", title: "Publish Event" }, { id: "list-apps", title: "List Apps" }, { id: "get-app-detail", title: "Get App Detail" }],
    render: () => <><p>Base URL: <code>https://gateway.internal/api/v1</code></p><p>Auth: semua endpoint memerlukan header <code>Authorization: Bearer &lt;secret&gt;</code>.</p><h2 id="publish-event">Publish Event</h2><CodeBlock>{`POST /events/publish`}</CodeBlock><APIParam name="app_id" type="string" required>ID aplikasi.</APIParam><APIParam name="channel" type="string" required>Nama channel target.</APIParam><APIParam name="event" type="string" required>Nama event (dot-notation).</APIParam><APIParam name="data" type="object" required>Payload bebas, max 10KB.</APIParam><h2 id="list-apps">List Apps</h2><CodeBlock>{`GET /apps`}</CodeBlock><p>Query params: <code>status</code>, <code>page</code>, <code>per_page</code>.</p><h2 id="get-app-detail">Get App Detail</h2><CodeBlock>{`GET /apps/:id`}</CodeBlock><p>Lihat dokumentasi Apps lengkap di file <code>07-api-spec.md</code> untuk semua endpoint dan response shape.</p></>
  }
};

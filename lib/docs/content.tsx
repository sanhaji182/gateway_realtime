import { APIParam } from "@/components/docs/APIParam";
import { Callout } from "@/components/docs/Callout";
import { CodeBlock } from "@/components/docs/CodeBlock";
import type { TocItem } from "@/components/docs/TableOfContents";

type DocsContent = {
  toc: TocItem[];
  render: () => React.ReactNode;
};

export const docsContent: Record<string, DocsContent> = {
  "tutorial-php": {
    toc: [
      { id: "overview", title: "Overview" },
      { id: "install", title: "Installation" },
      { id: "laravel", title: "Laravel Integration" },
      { id: "codeigniter", title: "CodeIgniter 4 Integration" },
      { id: "native", title: "Plain PHP Integration" },
      { id: "broadcast", title: "Broadcasting Events" },
      { id: "batch", title: "Batch Publishing" },
      { id: "webhooks", title: "Receiving Webhooks" },
      { id: "next", title: "Next Steps" },
    ],
    render: () => (<>
      <h2 id="overview">Overview</h2>
      <p>This guide walks you through integrating Gateway Realtime into a PHP application — whether you use Laravel, CodeIgniter 4, or plain PHP. By the end, your backend will be publishing realtime events to your frontend.</p>
      <Callout type="info">Prerequisites: Gateway Realtime running (dashboard at <code>:3000</code>, WebSocket at <code>:4000</code>). See <a href="/docs/installation">Installation</a> first.</Callout>

      <h2 id="install">Installation</h2>
      <CodeBlock language="bash">{`
cd your-php-project
composer require gateway/sdk-php
      `}</CodeBlock>
      <p>The SDK is a single PHP class — no framework required. Works with PHP 8.0+.</p>

      <h2 id="laravel">Laravel Integration</h2>
      <h3>Step 1: Add config</h3>
      <CodeBlock language="php" filename="config/gateway.php">{`
return [
    'app_id'  => env('GATEWAY_APP_ID', ''),
    'key'     => env('GATEWAY_KEY', ''),
    'secret'  => env('GATEWAY_SECRET', ''),
    'host'    => env('GATEWAY_HOST', 'http://localhost:3000'),
];
      `}</CodeBlock>

      <h3>Step 2: Add to .env</h3>
      <CodeBlock language="bash" filename=".env">{`
GATEWAY_APP_ID=app_a1b2c
GATEWAY_KEY=pk_live_a1b2c3
GATEWAY_SECRET=sk_live_xyz...
GATEWAY_HOST=http://localhost:3000
      `}</CodeBlock>

      <h3>Step 3: Create a Service Provider</h3>
      <CodeBlock language="php" filename="app/Providers/GatewayServiceProvider.php">{`
namespace App\\Providers;

use GatewaySDK\\Client;
use Illuminate\\Support\\ServiceProvider;

class GatewayServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(Client::class, function () {
            return new Client(
                appId:  config('gateway.app_id'),
                key:     config('gateway.key'),
                secret:  config('gateway.secret'),
                host:    config('gateway.host'),
            );
        });
    }
}
      `}</CodeBlock>

      <h3>Step 4: Publish from anywhere</h3>
      <CodeBlock language="php" filename="app/Http/Controllers/OrderController.php">{`
use GatewaySDK\\Client;

class OrderController extends Controller
{
    public function store(Request $request, Client $gateway): JsonResponse
    {
        $order = Order::create($request->validated());

        // Publish realtime event
        $gateway->publish(
            channel: 'orders.' . $order->user_id,
            event:   'order.created',
            data:    $order->toArray(),
        );

        return response()->json($order, 201);
    }
}
      `}</CodeBlock>

      <h2 id="codeigniter">CodeIgniter 4 Integration</h2>

      <h3>Step 1: Create a helper or service</h3>
      <CodeBlock language="php" filename="app/Services/GatewayService.php">{`
namespace App\\Services;

use GatewaySDK\\Client;

class GatewayService
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client(
            appId:  env('GATEWAY_APP_ID'),
            key:     env('GATEWAY_KEY'),
            secret:  env('GATEWAY_SECRET'),
            host:    env('GATEWAY_HOST'),
        );
    }

    public function publish(string $channel, string $event, array $data): void
    {
        $this->client->publish($channel, $event, $data);
    }

    public function getClient(): Client
    {
        return $this->client;
    }
}
      `}</CodeBlock>

      <h3>Step 2: Use it in a controller</h3>
      <CodeBlock language="php" filename="app/Controllers/Order.php">{`
namespace App\\Controllers;

use App\\Services\\GatewayService;

class Order extends BaseController
{
    public function create()
    {
        $model = new \\App\\Models\\OrderModel();
        $id = $model->insert($this->request->getPost());

        $gw = new GatewayService();
        $gw->publish(
            channel: 'orders',
            event:   'order.created',
            data:    ['order_id' => $id, 'total' => $this->request->getPost('total')],
        );

        return $this->response->setJSON(['id' => $id]);
    }
}
      `}</CodeBlock>

      <h2 id="native">Plain PHP Integration</h2>
      <CodeBlock language="php" filename="publish.php">{`
<?php
require_once __DIR__ . '/vendor/autoload.php';

use GatewaySDK\\Client;

$client = new Client(
    appId:  getenv('GATEWAY_APP_ID'),
    key:     getenv('GATEWAY_KEY'),
    secret:  getenv('GATEWAY_SECRET'),
    host:    getenv('GATEWAY_HOST') ?: 'http://localhost:3000',
);

// Called after an order is paid
$orderId = 99;
$amount  = 250000;

$client->publish(
    channel: 'orders',
    event:   'order.paid',
    data:    [
        'order_id' => $orderId,
        'amount'   => $amount,
        'currency' => 'IDR',
        'buyer'    => 'Budi',
    ],
);

echo "Event published for order #{$orderId}\\n";
      `}</CodeBlock>

      <h2 id="broadcast">Broadcasting Events from Your App</h2>
      <p>The full API reference for the PHP SDK client:</p>
      <table>
        <thead><tr><th>Method</th><th>Parameters</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>publish()</code></td><td><code>channel, event, data</code></td><td>Publish a single event.</td></tr>
          <tr><td><code>publishBatch()</code></td><td><code>array of events</code></td><td>Publish up to 100 events in one request.</td></tr>
        </tbody>
      </table>

      <h2 id="batch">Batch Publishing</h2>
      <p>For high-throughput backends, batch publishing reduces HTTP overhead:</p>
      <CodeBlock language="php">{`
$client->publishBatch([
    ['channel' => 'orders.1', 'event' => 'order.paid',    'data' => ['id' => 1, 'amount' => 150000]],
    ['channel' => 'orders.1', 'event' => 'order.shipped', 'data' => ['id' => 1]],
    ['channel' => 'alerts',   'event' => 'alert.created', 'data' => ['msg' => 'CPU > 90%']],
]);
      `}</CodeBlock>

      <h2 id="webhooks">Receiving Webhooks in PHP</h2>
      <p>If you configured a webhook endpoint, your PHP app needs to verify the signature and process the payload:</p>
      <CodeBlock language="php" filename="webhook.php">{`
<?php
$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'] ?? '';
$secret    = getenv('GATEWAY_WEBHOOK_SECRET');

// Verify HMAC signature
$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);

// Process the event
match ($event['event']) {
    'order.paid'    => handleOrderPaid($event['data']),
    'alert.created' => handleAlert($event['data']),
    default         => logEvent($event),
};

http_response_code(200);
echo 'OK';
      `}</CodeBlock>

      <h2 id="without-composer">Without Composer / Plain HTTP</h2>
      <p>You don't need Composer or the SDK at all. Publish events with a simple HTTP POST from any PHP app—even shared hosting.</p>

      <h3>Option A: Manual SDK include</h3>
      <p>Download <code>sdk/php/src/Client.php</code> and require it directly:</p>
      <CodeBlock language="php">{`
<?php
require_once __DIR__ . '/Client.php';

$client = new \GatewaySDK\Client(
    appId:  'app_a1b2c',
    key:    'pk_live_xxx',
    secret: 'sk_live_xxx',
    host:   'http://localhost:3000',
);

$client->publish(
    channel: 'orders',
    event:   'order.paid',
    data:    ['order_id' => 99, 'amount' => 250000],
);
      `}</CodeBlock>

      <h3>Option B: Raw cURL / file_get_contents</h3>
      <p>No dependencies at all — just a plain HTTP POST:</p>
      <CodeBlock language="php">{`
<?php
// === Method 1: file_get_contents (stream context) ===
$payload = json_encode([
    'channel' => 'orders',
    'event'   => 'order.paid',
    'data'    => ['order_id' => 99, 'amount' => 250000, 'buyer' => 'Budi'],
]);

$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 5,
    ],
]);

$result = file_get_contents('http://localhost:3000/api/v1/events', false, $context);
echo $result ? "Published\n" : "Failed\n";

// === Method 2: cURL ===
\$ch = curl_init('http://localhost:3000/api/v1/events');
curl_setopt_array(\$ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode([
        'channel' => 'orders',
        'event'   => 'order.paid',
        'data'    => ['order_id' => 99, 'amount' => 250000],
    ]),
]);
\$response = curl_exec(\$ch);
\$httpCode = curl_getinfo(\$ch, CURLINFO_HTTP_CODE);
curl_close(\$ch);

if (\$httpCode === 200) {
    echo "Event published!\n";
} else {
    echo "Failed (HTTP \$httpCode): \$response\n";
}
      `}</CodeBlock>

      <h3>Option C: Batch publish via raw HTTP</h3>
      <CodeBlock language="php">{`
<?php
$events = [
    ['channel' => 'orders',   'event' => 'order.paid',    'data' => ['id' => 1, 'amount' => 150000]],
    ['channel' => 'orders',   'event' => 'order.shipped', 'data' => ['id' => 1]],
    ['channel' => 'alerts',   'event' => 'alert.created', 'data' => ['msg' => 'Stock low']],
];

\$ch = curl_init('http://localhost:3000/api/v1/events/batch');
curl_setopt_array(\$ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode(['batch' => $events]),
]);

\$resp = curl_exec(\$ch);
curl_close(\$ch);
print_r(json_decode(\$resp, true));
// Output: { "published": 3, "failed": 0, "results": [...] }
      `}</CodeBlock>

      <Callout type="info">For production with <code>X-App-Key</code> + <code>X-Signature</code> auth, add the headers to the cURL/stream context options. See <a href="/docs/authentication">Authentication</a>.</Callout>

<h2 id="next">Next Steps</h2>
      <ul>
        <li>Read the <a href="/docs/javascript-sdk">JavaScript SDK docs</a> to subscribe to events in the browser.</li>
        <li>See the <a href="/docs/publishing-events">Publishing Events</a> reference for Redis pub/sub and REST API options.</li>
        <li>Check the <a href="/docs/webhooks">Webhooks</a> guide for retry policies and monitoring.</li>
      </ul>
    </>),
  },
  "tutorial-js": {
    toc: [
      { id: "overview", title: "Overview" },
      { id: "vanilla", title: "Vanilla HTML/JS" },
      { id: "react", title: "React / Next.js" },
      { id: "token", title: "Getting a JWT Token" },
      { id: "subscribe", title: "Subscribing to Events" },
      { id: "publish", title: "Publishing from Browser" },
      { id: "next", title: "Next Steps" },
    ],
    render: () => (<>
      <h2 id="overview">Overview</h2>
      <p>This guide shows how to add realtime features to any JavaScript frontend — vanilla HTML, React, or Next.js. You'll connect to Gateway, subscribe to channels, and handle incoming events in under 5 minutes.</p>

      <h2 id="vanilla">Vanilla HTML / JavaScript</h2>
      <p>Simplest approach — one script tag, no bundler needed:</p>
      <CodeBlock language="html">{`
<!DOCTYPE html>
<html>
<head><title>Realtime Dashboard</title></head>
<body>
  <h1>Orders</h1>
  <ul id="order-list"></ul>

  <script src="http://localhost:4000/sdk/gateway.js"></script>
  <script>
    (async () => {
      // 1. Get JWT token from your auth endpoint
      const res = await fetch('/api/socket/token')
      const { token } = await res.json()

      // 2. Connect
      const gw = new GatewayClient({ host: 'http://localhost:4000' })

      gw.on('connected', () => {
        // 3. Subscribe
        const orders = gw.subscribe('orders')
        orders.on('order.created', (data) => {
          const li = document.createElement('li')
          li.textContent = \`Order #\${data.order_id}: Rp \${data.amount}\`
          document.getElementById('order-list').appendChild(li)
        })
      })

      gw.connect(token)
    })()
  </script>
</body>
</html>
      `}</CodeBlock>

      <h2 id="react">React / Next.js Integration</h2>
      <p>Use the TypeScript SDK from <code>lib/socket/</code> for full type safety:</p>
      <CodeBlock language="tsx">{`
// hooks/useRealtime.ts
import { Sdk } from "@/lib/socket";
import { useEffect, useRef, useState } from "react";

export function useRealtimeOrder(channel: string) {
  const [orders, setOrders] = useState<any[]>([]);
  const sdkRef = useRef<Sdk | null>(null);

  useEffect(() => {
    const sdk = new Sdk({ host: "http://localhost:4000" });
    sdkRef.current = sdk;

    fetch("/api/socket/token")
      .then(r => r.json())
      .then(({ token }) => {
        sdk.on("connected", () => {
          sdk.subscribe(channel).on("order.created", (data) => {
            setOrders(prev => [...prev, data]);
          });
        });
        sdk.connect(token);
      });

    return () => { sdk.disconnect(); };
  }, [channel]);

  return orders;
}

// pages/dashboard.tsx
export default function Dashboard() {
  const orders = useRealtimeOrder("orders");
  return (
    <ul>
      {orders.map((o, i) => <li key={i}>Order #{o.order_id}: Rp {o.amount}</li>)}
    </ul>
  );
}
      `}</CodeBlock>

      <h2 id="token">Getting a JWT Token</h2>
      <p>The gateway requires a JWT for WebSocket authentication. The dashboard provides a <code>/api/socket/token</code> endpoint for development. In production, generate JWTs server-side:</p>
      <CodeBlock language="ts">{`
// Your backend generates the JWT:
import { SignJWT } from "jose";

const token = await new SignJWT({ user_id: "123", role: "admin" })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("24h")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
      `}</CodeBlock>

      <h2 id="subscribe">Subscribing to Events</h2>
      <CodeBlock language="ts">{`
// Public channel
gw.subscribe('alerts').on('alert.created', handler)

// Private channel (requires auth)
gw.subscribe('private-orders.99', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST', body: JSON.stringify({ socket_id, channel_name }),
    })
    return res.json()
  }
})

// Presence channel
gw.subscribe('presence-lobby', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST',
      body: JSON.stringify({ socket_id, channel_name, user_id: '123', user_info: { name: 'Budi' } }),
    })
    return res.json()
  }
}).on('member_added', (m) => console.log(m.user_info.name, 'joined'))
      `}</CodeBlock>

      <h2 id="publish">Publishing from the Browser</h2>
      <Callout type="warning">The REST publish endpoint requires authentication. Use <code>X-App-Key</code> + <code>X-Signature</code> headers, or a session cookie.</Callout>
      <CodeBlock language="ts">{`
// Via REST API (with session cookie)
await fetch('/api/v1/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    channel: 'orders',
    event: 'order.paid',
    data: { order_id: 1, amount: 250000 },
  }),
})
      `}</CodeBlock>
      <p>For production, publish from your backend — never expose secrets in the browser.</p>

      <h2 id="without-composer">Without Composer / Plain HTTP</h2>
      <p>You don't need Composer or the SDK at all. Publish events with a simple HTTP POST from any PHP app—even shared hosting.</p>

      <h3>Option A: Manual SDK include</h3>
      <p>Download <code>sdk/php/src/Client.php</code> and require it directly:</p>
      <CodeBlock language="php">{`
<?php
require_once __DIR__ . '/Client.php';

$client = new \GatewaySDK\Client(
    appId:  'app_a1b2c',
    key:    'pk_live_xxx',
    secret: 'sk_live_xxx',
    host:   'http://localhost:3000',
);

$client->publish(
    channel: 'orders',
    event:   'order.paid',
    data:    ['order_id' => 99, 'amount' => 250000],
);
      `}</CodeBlock>

      <h3>Option B: Raw cURL / file_get_contents</h3>
      <p>No dependencies at all — just a plain HTTP POST:</p>
      <CodeBlock language="php">{`
<?php
// === Method 1: file_get_contents (stream context) ===
$payload = json_encode([
    'channel' => 'orders',
    'event'   => 'order.paid',
    'data'    => ['order_id' => 99, 'amount' => 250000, 'buyer' => 'Budi'],
]);

$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 5,
    ],
]);

$result = file_get_contents('http://localhost:3000/api/v1/events', false, $context);
echo $result ? "Published\n" : "Failed\n";

// === Method 2: cURL ===
\$ch = curl_init('http://localhost:3000/api/v1/events');
curl_setopt_array(\$ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode([
        'channel' => 'orders',
        'event'   => 'order.paid',
        'data'    => ['order_id' => 99, 'amount' => 250000],
    ]),
]);
\$response = curl_exec(\$ch);
\$httpCode = curl_getinfo(\$ch, CURLINFO_HTTP_CODE);
curl_close(\$ch);

if (\$httpCode === 200) {
    echo "Event published!\n";
} else {
    echo "Failed (HTTP \$httpCode): \$response\n";
}
      `}</CodeBlock>

      <h3>Option C: Batch publish via raw HTTP</h3>
      <CodeBlock language="php">{`
<?php
$events = [
    ['channel' => 'orders',   'event' => 'order.paid',    'data' => ['id' => 1, 'amount' => 150000]],
    ['channel' => 'orders',   'event' => 'order.shipped', 'data' => ['id' => 1]],
    ['channel' => 'alerts',   'event' => 'alert.created', 'data' => ['msg' => 'Stock low']],
];

\$ch = curl_init('http://localhost:3000/api/v1/events/batch');
curl_setopt_array(\$ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => json_encode(['batch' => $events]),
]);

\$resp = curl_exec(\$ch);
curl_close(\$ch);
print_r(json_decode(\$resp, true));
// Output: { "published": 3, "failed": 0, "results": [...] }
      `}</CodeBlock>

      <Callout type="info">For production with <code>X-App-Key</code> + <code>X-Signature</code> auth, add the headers to the cURL/stream context options. See <a href="/docs/authentication">Authentication</a>.</Callout>

<h2 id="next">Next Steps</h2>
      <ul>
        <li>Read the full <a href="/docs/javascript-sdk">JavaScript SDK reference</a> for all methods and types.</li>
        <li>Check <a href="/docs/presence">Presence Channels</a> for real-time user tracking.</li>
        <li>See <a href="/docs/tutorial-php">PHP Integration Guide</a> for backend event publishing.</li>
      </ul>
    </>),
  },

  // ──────────────────────────────────────────────
  // GETTING STARTED
  // ──────────────────────────────────────────────
  introduction: {
    toc: [
      { id: "what-is-gateway", title: "What is Gateway?" },
      { id: "how-it-works", title: "How it works" },
      { id: "when-to-use", title: "When to use" },
      { id: "architecture", title: "Architecture" },
      { id: "features", title: "Features" },
    ],
    render: () => (<>
      <p><strong>Gateway Realtime</strong> is a self-hosted realtime event system. Think Pusher or Ably — but running on your own infrastructure with full control.</p>
      <h2 id="what-is-gateway">What is Gateway?</h2>
      <p>Gateway connects your backend services to your frontend in realtime. Your backend publishes events, Gateway distributes them via WebSocket to every connected client subscribed to that channel.</p>
      <h2 id="how-it-works">How it works</h2>
      <ol>
        <li>Your backend (Go, PHP, Node.js) publishes an event via the REST API.</li>
        <li>Gateway routes the event through Redis pub/sub to all server instances.</li>
        <li>Every WebSocket client subscribed to the matching channel receives the event instantly.</li>
      </ol>
      <h2 id="when-to-use">When to use</h2>
      <ul>
        <li>Real-time order notifications (e.g., "New order #123 from Budi").</li>
        <li>Live status updates without page refresh.</li>
        <li>Typing indicators and chat messages.</li>
        <li>Admin broadcast announcements to all connected users.</li>
        <li>Live dashboards with auto-refreshing data.</li>
        <li>Monitoring alerts pushed to ops team in realtime.</li>
      </ul>
      <h2 id="architecture">Architecture</h2>
      <CodeBlock language="text">{`
┌──────────────────────────────────────────┐
│  Browser / Mobile App                    │
│  ┌────────────────────────────────────┐  │
│  │  GatewayClient SDK                 │  │
│  │  (auto-reconnect, presence, auth)  │  │
│  └────────────┬───────────────────────┘  │
└───────────────┼──────────────────────────┘
                │ WebSocket
┌───────────────┼──────────────────────────┐
│  Gateway Server (Go)                     │
│  ┌────────────┴───────────────────────┐  │
│  │  HTTP + WebSocket Handler          │  │
│  │  • /ws — WebSocket upgrade         │  │
│  │  • /api/socket/auth — channel auth │  │
│  │  • /health, /metrics               │  │
│  └────────────┬───────────────────────┘  │
│               │                          │
│  ┌────────────▼───────────────────────┐  │
│  │  Redis Pub/Sub                     │  │
│  │  (cross-instance message routing)  │  │
│  └────────────┬───────────────────────┘  │
└───────────────┼──────────────────────────┘
                │
┌───────────────▼──────────────────────────┐
│  Your Backend                            │
│  Publish events via REST API             │
│  POST /api/v1/events                     │
└──────────────────────────────────────────┘
      `}</CodeBlock>
      <h2 id="features">Features</h2>
      <table>
        <thead><tr><th>Feature</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td>Public Channels</td><td>Anyone can subscribe — no auth needed.</td></tr>
          <tr><td>Private Channels</td><td>HMAC-signed subscription requests.</td></tr>
          <tr><td>Presence Channels</td><td>Real-time member lists with join/leave events.</td></tr>
          <tr><td>Wildcard Channels</td><td>Subscribe to <code>orders.*</code> to get all order events.</td></tr>
          <tr><td>Webhooks</td><td>HTTP callbacks to your backend on every event.</td></tr>
          <tr><td>Auto Reconnect</td><td>Exponential backoff on disconnect.</td></tr>
          <tr><td>Multi-Instance</td><td>Scale horizontally behind a load balancer.</td></tr>
        </tbody>
      </table>
    </>),
  },
  "quick-start": {
    toc: [
      { id: "create-app", title: "1. Create App" },
      { id: "publish-event", title: "2. Publish event" },
      { id: "subscribe", title: "3. Subscribe" },
      { id: "verify", title: "4. Verify" },
    ],
    render: () => (<>
      <p>Get your first event flowing in under 5 minutes.</p>
      <h2 id="create-app">1. Create App</h2>
      <p>Login to the dashboard → <strong>Apps</strong> → <strong>New App</strong>. Note your <code>App ID</code>, <code>Key</code>, and <code>Secret</code>.</p>
      <h2 id="publish-event">2. Publish event</h2>
      <CodeBlock language="bash">{`
curl -X POST http://localhost:3000/api/v1/events \\
  -H "Content-Type: application/json" \\
  -H "Cookie: gateway_session=..." \\
  -d '{
    "channel": "orders",
    "event": "order.created",
    "data": { "order_id": 1, "amount": 250000 }
  }'
      `}</CodeBlock>
      <h2 id="subscribe">3. Subscribe in frontend</h2>
      <CodeBlock language="html">{`
<script src="http://localhost:4000/sdk/gateway.js"></script>
<script>
const gw = new GatewayClient({ host: 'http://localhost:4000' })
gw.on('connected', () => {
  const ch = gw.subscribe('orders')
  ch.on('order.created', (data) => {
    console.log('New order:', data)
  })
})
</script>
      `}</CodeBlock>
      <h2 id="verify">4. Verify</h2>
      <p>Open the dashboard → <strong>Events</strong>. Your published event should appear in the table. Check <strong>Connections</strong> to see active WebSocket clients.</p>
    </>),
  },
  installation: {
    toc: [
      { id: "docker", title: "Docker Compose" },
      { id: "manual-redis", title: "Redis" },
      { id: "manual-gateway", title: "Gateway Server" },
      { id: "manual-dashboard", title: "Dashboard" },
      { id: "env-vars", title: "Environment" },
    ],
    render: () => (<>
      <h2 id="docker">Docker Compose (Recommended)</h2>
      <CodeBlock language="bash">{`
git clone https://github.com/sanhaji182/gateway_realtime.git
cd gateway_realtime
docker compose up -d
      `}</CodeBlock>
      <p>This starts Redis, the Go WebSocket server, and the Next.js dashboard. Dashboard available at <code>http://localhost:3000</code>, WebSocket at <code>ws://localhost:4000</code>.</p>
      <h2 id="manual-redis">1. Redis</h2>
      <CodeBlock language="bash">{`
redis-server
# or via Docker:
docker run -d -p 6379:6379 redis:7-alpine
      `}</CodeBlock>
      <h2 id="manual-gateway">2. Gateway Server (Go)</h2>
      <CodeBlock language="bash">{`
cd backend_go
REDIS_URL=redis://localhost:6379 \\
JWT_SECRET=change-me-in-production-64-chars-min \\
ALLOWED_ORIGINS=http://localhost:3000 \\
go run main.go
      `}</CodeBlock>
      <h2 id="manual-dashboard">3. Dashboard (Next.js)</h2>
      <CodeBlock language="bash">{`
npm install
npm run dev
# Dashboard: http://localhost:3000
      `}</CodeBlock>
      <h2 id="env-vars">Required Environment Variables</h2>
      <table>
        <thead><tr><th>Variable</th><th>Purpose</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td><code>REDIS_URL</code></td><td>Redis connection string</td><td>—</td></tr>
          <tr><td><code>JWT_SECRET</code></td><td>HMAC-SHA256 signing key</td><td>—</td></tr>
          <tr><td><code>ALLOWED_ORIGINS</code></td><td>CORS origins (comma-separated)</td><td>—</td></tr>
          <tr><td><code>PORT</code></td><td>HTTP listen port</td><td>4000</td></tr>
          <tr><td><code>LOG_LEVEL</code></td><td>zerolog level</td><td>info</td></tr>
        </tbody>
      </table>
    </>),
  },

  // ──────────────────────────────────────────────
  // CORE CONCEPTS
  // ──────────────────────────────────────────────
  authentication: {
    toc: [
      { id: "app-key-secret", title: "App Key & Secret" },
      { id: "websocket-auth", title: "WebSocket Auth" },
      { id: "private-channel-auth", title: "Private Channel Auth" },
      { id: "rotate-secret", title: "Rotate Secret" },
    ],
    render: () => (<>
      <h2 id="app-key-secret">App Key & Secret</h2>
      <p>Every app gets two credentials:</p>
      <table>
        <thead><tr><th>Credential</th><th>Visibility</th><th>Used for</th></tr></thead>
        <tbody>
          <tr><td>App Key (<code>pk_live_...</code>)</td><td>Public</td><td>Subscribe (frontend)</td></tr>
          <tr><td>App Secret (<code>sk_live_...</code>)</td><td>Private</td><td>Publish (backend only)</td></tr>
        </tbody>
      </table>
      <Callout type="warning">Never expose the App Secret in frontend code or git repositories. Use environment variables.</Callout>
      <h2 id="websocket-auth">WebSocket Auth (JWT)</h2>
      <p>The WebSocket handshake requires a JWT token signed with your <code>JWT_SECRET</code>:</p>
      <CodeBlock language="js">{`
const res = await fetch('/api/socket/token')
const { token } = await res.json()
const ws = new WebSocket(\`ws://localhost:4000/ws?token=\${token}\`)
      `}</CodeBlock>
      <p>JWT claims: <code>sub</code> (user_id), <code>role</code> (admin/viewer), <code>exp</code> (expiry), <code>iat</code> (issued at).</p>
      <h2 id="private-channel-auth">Private Channel Auth</h2>
      <p>For private and presence channels, the client must provide an HMAC signature:</p>
      <CodeBlock language="bash">{`
POST /api/socket/auth
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "socket_id": "ws_abc123...",
  "channel_name": "private-orders",
  "user_id": "user_1",
  "app_id": "app_a1b2c"
}
# Response: { "data": { "auth": "app_a1b2c:abc123def456..." } }
      `}</CodeBlock>
      <h2 id="rotate-secret">Rotate Secret</h2>
      <p>Dashboard → Apps → [your app] → <strong>Rotate Secret</strong>. Old secret immediately invalidated. Existing WebSocket connections are NOT dropped.</p>
    </>),
  },
  channels: {
    toc: [
      { id: "overview", title: "Channel Types" },
      { id: "public", title: "Public" },
      { id: "private", title: "Private" },
      { id: "presence", title: "Presence" },
      { id: "wildcard", title: "Wildcard" },
      { id: "naming", title: "Naming Rules" },
    ],
    render: () => (<>
      <h2 id="overview">Channel Types</h2>
      <p>Channels are the core routing mechanism. Events are published to a channel and delivered to all subscribers of that channel.</p>
      <table>
        <thead><tr><th>Type</th><th>Prefix</th><th>Auth</th><th>Example</th></tr></thead>
        <tbody>
          <tr><td>Public</td><td>—</td><td>None</td><td><code>orders</code></td></tr>
          <tr><td>Private</td><td><code>private-</code></td><td>HMAC signature</td><td><code>private-orders.99</code></td></tr>
          <tr><td>Presence</td><td><code>presence-</code></td><td>HMAC + user_info</td><td><code>presence-lobby</code></td></tr>
          <tr><td>Wildcard</td><td><code>.*</code></td><td>Per channel</td><td><code>orders.*</code></td></tr>
        </tbody>
      </table>
      <h2 id="public">Public Channels</h2>
      <p>No authentication required. Anyone can subscribe and receive events.</p>
      <CodeBlock language="js">{`
const ch = gw.subscribe('notifications')
ch.on('alert', (data) => console.log(data))
      `}</CodeBlock>
      <h2 id="private">Private Channels</h2>
      <p>Require HMAC signature from your auth endpoint. The gateway verifies the signature before allowing subscription.</p>
      <CodeBlock language="js">{`
const ch = gw.subscribe('private-orders.99', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socket_id, channel_name, user_id: '123' }),
    })
    return res.json()
  }
})
      `}</CodeBlock>
      <h2 id="presence">Presence Channels</h2>
      <p>Extends private channels with real-time member tracking. When a user subscribes, all existing members are broadcast. Join/leave events fire automatically.</p>
      <CodeBlock language="js">{`
const ch = gw.subscribe('presence-lobby', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST',
      body: JSON.stringify({
        socket_id, channel_name, user_id: '123',
        user_info: { name: 'Budi', avatar: 'https://...' }
      }),
    })
    return res.json()
  }
})
ch.on('member_added', (member) => console.log('joined:', member))
ch.on('member_removed', (member) => console.log('left:', member))
      `}</CodeBlock>
      <h2 id="wildcard">Wildcard Channels</h2>
      <p>End a channel name with <code>.*</code> to receive events from all matching channels. Requires admin role.</p>
      <CodeBlock language="js">{`
gw.subscribe('orders.*')  // receives events.1, events.2, notifications.1, etc.
      `}</CodeBlock>
      <h2 id="naming">Naming Rules</h2>
      <ul>
        <li>Maximum 100 characters.</li>
        <li>Allowed: <code>a-z</code>, <code>0-9</code>, <code>.</code>, <code>-</code>.</li>
        <li>Private/presence prefix: <code>private-</code> or <code>presence-</code>.</li>
        <li>Use dot-separated namespacing: <code>orders.99</code>, <code>chat.room.55</code>.</li>
      </ul>
    </>),
  },
  "publishing-events": {
    toc: [
      { id: "rest-api", title: "REST API" },
      { id: "php-sdk", title: "PHP SDK" },
      { id: "redis-pubsub", title: "Redis Pub/Sub" },
      { id: "event-naming", title: "Event Naming" },
      { id: "limits", title: "Limits" },
    ],
    render: () => (<>
      <h2 id="rest-api">REST API</h2>
      <CodeBlock language="bash">{`
POST /api/v1/events
Content-Type: application/json
Cookie: gateway_session=...

{
  "channel": "orders.99",
  "event": "order.paid",
  "data": { "order_id": 99, "amount": 250000, "buyer": "Budi" }
}
      `}</CodeBlock>
      <p>Response: <code>200 OK</code> with <code>{}</code> on success, or <code>202</code> if Redis is temporarily unavailable.</p>
      <h2 id="php-sdk">PHP SDK</h2>
      <CodeBlock language="php">{`
use GatewaySDK\\Client;

$client = new Client(
    appId:  'app_a1b2c',
    key:    'pk_live_a1b2c3',
    secret: 'sk_live_xyz...',
    host:   'https://gateway.internal'
);

$client->publish(
    channel: 'orders.99',
    event:   'order.paid',
    data:    ['order_id' => 99, 'amount' => 150000]
);
      `}</CodeBlock>
      <p>Install: <code>composer require gateway/sdk-php</code></p>
      <h2 id="redis-pubsub">Redis Pub/Sub (Direct)</h2>
      <p>For backend services with direct Redis access, you can publish events to the <code>events.*</code> channel pattern:</p>
      <CodeBlock language="bash">{`
redis-cli PUBLISH 'events.orders.99' '{
  "type": "event",
  "channel": "orders.99",
  "event": "order.paid",
  "data": { "order_id": 99 },
  "ts": 1746432001842
}'
      `}</CodeBlock>
      <p>This is the lowest-latency publish path — bypasses the REST API entirely.</p>
      <h2 id="event-naming">Event Naming</h2>
      <ul>
        <li>Use dot-notation: <code>order.paid</code>, <code>message.sent</code>, <code>typing.start</code>.</li>
        <li>Maximum 200 characters.</li>
        <li>Convention: <code>noun.verb</code> in present or past tense.</li>
      </ul>
      <h2 id="limits">Limits</h2>
      <ul>
        <li>Max payload size: 10 KB per event.</li>
        <li>Max 100 events per batch publish (<code>POST /api/v1/events/batch</code>).</li>
        <li>Rate limits apply based on your plan (if using SaaS Cloud).</li>
      </ul>
    </>),
  },
  "subscribing-events": {
    toc: [
      { id: "browser-sdk", title: "Browser SDK" },
      { id: "subscribe-public", title: "Subscribe Public" },
      { id: "subscribe-private", title: "Subscribe Private" },
      { id: "event-handling", title: "Event Handling" },
      { id: "unsubscribe", title: "Unsubscribe" },
      { id: "connection-lifecycle", title: "Connection Lifecycle" },
    ],
    render: () => (<>
      <h2 id="browser-sdk">Browser SDK</h2>
      <CodeBlock language="html">{`
<script src="http://localhost:4000/sdk/gateway.js"></script>
<script>
const gw = new GatewayClient({
  host: 'http://localhost:4000',
  autoReconnect: true
})
</script>
      `}</CodeBlock>
      <h2 id="subscribe-public">Subscribe — Public Channel</h2>
      <CodeBlock language="js">{`
const channel = gw.subscribe('orders')
channel.on('order.paid', (data) => {
  console.log('Order paid:', data)
})
      `}</CodeBlock>
      <h2 id="subscribe-private">Subscribe — Private Channel</h2>
      <CodeBlock language="js">{`
const channel = gw.subscribe('private-orders.99', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ socket_id, channel_name }),
    })
    return res.json()
  }
})
      `}</CodeBlock>
      <h2 id="event-handling">Event Handling</h2>
      <CodeBlock language="js">{`
// Channel-specific handlers
channel.on('order.paid', handler)
channel.on('order.shipped', handler)
channel.off('order.paid', handler)

// Wildcard handler — fires for all events on this channel
channel.on('*', (eventName, data) => {
  console.log(\`Channel event: \${eventName}\`, data)
})

// Global connection events
gw.on('connected', () => console.log('WS open'))
gw.on('disconnected', (reason) => console.log('WS closed:', reason))
gw.on('reconnecting', ({ attempt, delayMs }) => console.log(\`Reconnect #\${attempt}\`))
gw.on('error', (err) => console.error(err))
      `}</CodeBlock>
      <h2 id="unsubscribe">Unsubscribe</h2>
      <CodeBlock language="js">{`
gw.unsubscribe('orders')          // unsubscribe by name
channel.unsubscribe()             // unsubscribe via channel object
      `}</CodeBlock>
      <h2 id="connection-lifecycle">Connection Lifecycle</h2>
      <ol>
        <li><strong>connected</strong> — WebSocket handshake successful, socket ID assigned.</li>
        <li><strong>subscription_succeeded</strong> — Channel subscription confirmed.</li>
        <li><strong>subscription_error</strong> — Auth failed or channel invalid.</li>
        <li><strong>heartbeat</strong> — Periodic ping response (client sends <code>{'"type":"ping"'}</code>).</li>
        <li><strong>disconnected</strong> — Connection closed (clean or error).</li>
        <li><strong>reconnecting</strong> — Auto-reconnect attempt with backoff.</li>
      </ol>
    </>),
  },
  presence: {
    toc: [
      { id: "overview", title: "Overview" },
      { id: "subscribe", title: "Subscribe" },
      { id: "members", title: "Member Events" },
      { id: "user-info", title: "User Info" },
    ],
    render: () => (<>
      <h2 id="overview">Overview</h2>
      <p>Presence channels extend private channels with real-time awareness of who is online. Every subscriber is tracked and member join/leave events are broadcast automatically.</p>
      <h2 id="subscribe">Subscribe</h2>
      <CodeBlock language="js">{`
const lobby = gw.subscribe('presence-lobby', {
  auth: async ({ socket_id, channel_name }) => {
    const res = await fetch('/api/socket/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        socket_id, channel_name, user_id: '123',
        user_info: { name: 'Budi', role: 'admin' }
      }),
    })
    return res.json()
  }
})
      `}</CodeBlock>
      <p>On successful subscription, you receive the full member list immediately:</p>
      <CodeBlock language="json">{`
{
  "type": "system",
  "event": "subscription_succeeded",
  "data": {
    "members": [
      { "user_id": "123", "user_info": { "name": "Budi" }, "socket_id": "ws_abc" },
      { "user_id": "456", "user_info": { "name": "Siti" }, "socket_id": "ws_def" }
    ],
    "count": 2
  }
}
      `}</CodeBlock>
      <h2 id="members">Member Events</h2>
      <CodeBlock language="js">{`
lobby.on('member_added', (member) => {
  showJoinNotification(\`\${member.user_info.name} joined\`)
})
lobby.on('member_removed', (member) => {
  showLeaveNotification(\`\${member.user_info.name} left\`)
})
      `}</CodeBlock>
      <h2 id="user-info">User Info</h2>
      <p><code>user_info</code> can contain any non-sensitive metadata: name, avatar URL, role, status. Keep under 1 KB for performance. Never include passwords, tokens, or PII.</p>
    </>),
  },
  webhooks: {
    toc: [
      { id: "overview", title: "Overview" },
      { id: "configuration", title: "Configuration" },
      { id: "payload", title: "Payload" },
      { id: "signature-verification", title: "Signature Verification" },
      { id: "retry-policy", title: "Retry Policy" },
      { id: "monitoring", title: "Monitoring" },
    ],
    render: () => (<>
      <h2 id="overview">Overview</h2>
      <p>Webhooks let Gateway send HTTP POST requests to your backend every time a matching event is published. Use cases: logging, triggering background jobs, service-to-service notifications.</p>
      <h2 id="configuration">Configuration</h2>
      <p>Dashboard → Apps → [select app] → <strong>Webhook Endpoints</strong> → Add endpoint.</p>
      <ul>
        <li><strong>URL</strong>: Your backend endpoint.</li>
        <li><strong>Events</strong>: Filter by event name. Use <code>*</code> for all events.</li>
        <li><strong>Secret</strong>: Optional. Used for signature verification.</li>
      </ul>
      <h2 id="payload">Payload Format</h2>
      <CodeBlock language="json">{`
POST https://api.internal/webhook
Content-Type: application/json
X-Gateway-Signature: sha256=abc123...
X-Gateway-Timestamp: 1746432001
X-Gateway-Event: order.paid
X-Gateway-Channel: orders.99
X-Gateway-App: app_a1b2c

{
  "event": "order.paid",
  "channel": "orders.99",
  "app_id": "app_a1b2c",
  "data": { "order_id": 99, "amount": 250000 },
  "ts": 1746432001842
}
      `}</CodeBlock>
      <h2 id="signature-verification">Signature Verification</h2>
      <Callout type="info">Always verify webhook signatures in production. This prevents attackers from sending forged payloads.</Callout>
      <CodeBlock language="php">{`
$payload   = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GATEWAY_SIGNATURE'];
$secret    = env('GW_WEBHOOK_SECRET');

$expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    exit('Invalid signature');
}

$data = json_decode($payload, true);
// Process event...
      `}</CodeBlock>
      <h2 id="retry-policy">Retry Policy</h2>
      <table>
        <thead><tr><th>Attempt</th><th>Delay</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Immediate</td></tr>
          <tr><td>2</td><td>30 seconds</td></tr>
          <tr><td>3</td><td>5 minutes</td></tr>
          <tr><td>4</td><td>30 minutes</td></tr>
          <tr><td>5</td><td>2 hours</td></tr>
        </tbody>
      </table>
      <p>After 5 failed attempts, the delivery is marked dead. Manual retry available in the dashboard.</p>
      <h2 id="monitoring">Monitoring</h2>
      <p>Dashboard → <strong>Webhooks</strong> shows all delivery logs with status, latency, HTTP response code, and retry button for dead deliveries.</p>
    </>),
  },

  // ──────────────────────────────────────────────
  // SDK REFERENCE
  // ──────────────────────────────────────────────
  "javascript-sdk": {
    toc: [
      { id: "installation", title: "Installation" },
      { id: "constructor", title: "Constructor" },
      { id: "subscribe", title: "subscribe()" },
      { id: "events", title: "Event Methods" },
      { id: "disconnect", title: "disconnect()" },
      { id: "reconnect", title: "Auto-Reconnect" },
    ],
    render: () => (<>
      <h2 id="installation">Installation</h2>
      <CodeBlock language="bash">{`
npm install @gateway/socket
      `}</CodeBlock>
      <p>Or via CDN:</p>
      <CodeBlock language="html">{`
<script src="https://your-gateway.internal/sdk/gateway.js"></script>
      `}</CodeBlock>
      <h2 id="constructor">Constructor</h2>
      <CodeBlock language="ts">{`
new GatewayClient(options: GatewayOptions)

interface GatewayOptions {
  host: string           // Gateway server URL (http:// or ws://)
  autoReconnect?: boolean // Default: true
  key?: string           // App key (optional for JWT auth)
}
      `}</CodeBlock>
      <h2 id="subscribe">subscribe()</h2>
      <CodeBlock language="ts">{`
subscribe(channel: string, options?: SubscribeOptions): GatewayChannel

interface SubscribeOptions {
  auth?: (params: {
    socket_id: string
    channel_name: string
  }) => Promise<{ auth: string; channel_data?: any }>
}
      `}</CodeBlock>
      <p>Returns a <code>GatewayChannel</code> instance.</p>
      <h2 id="events">Event Methods</h2>
      <CodeBlock language="ts">{`
// Channel-level
channel.on(event: string, handler: (data: any) => void): GatewayChannel
channel.off(event: string, handler: Function): GatewayChannel
channel.on('*', (event, data) => {})  // wildcard handler

// Client-level
gw.on('connected', () => {})
gw.on('disconnected', (reason) => {})
gw.on('reconnecting', ({ attempt, delayMs }) => {})
gw.on('error', (err) => {})
      `}</CodeBlock>
      <h2 id="disconnect">disconnect()</h2>
      <CodeBlock language="ts">{`
gw.disconnect()  // closes WebSocket, stops auto-reconnect
      `}</CodeBlock>
      <h2 id="reconnect">Auto-Reconnect</h2>
      <p>On unexpected disconnect, the SDK reconnects with exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max). All previous channel subscriptions are automatically restored.</p>
      <p>Set <code>autoReconnect: false</code> in constructor to disable.</p>
    </>),
  },
  "php-sdk": {
    toc: [
      { id: "installation", title: "Installation" },
      { id: "publishing", title: "Publishing Events" },
      { id: "batch", title: "Batch Publish" },
      { id: "error-handling", title: "Error Handling" },
    ],
    render: () => (<>
      <h2 id="installation">Installation</h2>
      <CodeBlock language="bash">{`
composer require gateway/sdk-php
      `}</CodeBlock>
      <h2 id="publishing">Publishing Events</h2>
      <CodeBlock language="php">{`
use GatewaySDK\\Client;

$client = new Client(
    appId:  'app_a1b2c',
    key:    'pk_live_...',
    secret: 'sk_live_...',
    host:   'https://gateway.internal'
);

$client->publish(
    channel: 'orders.99',
    event:   'order.paid',
    data:    [
        'order_id' => 99,
        'amount'   => 250000,
        'buyer'    => 'Budi'
    ]
);
      `}</CodeBlock>
      <h2 id="batch">Batch Publish</h2>
      <CodeBlock language="php">{`
$client->publishBatch([
    ['channel' => 'orders.99', 'event' => 'order.paid',   'data' => ['id' => 1]],
    ['channel' => 'orders.99', 'event' => 'order.paid',   'data' => ['id' => 2]],
    ['channel' => 'chat.55',   'event' => 'message.sent', 'data' => ['text' => 'Hi']],
]);
      `}</CodeBlock>
      <p>Max 100 events per batch.</p>
      <h2 id="error-handling">Error Handling</h2>
      <CodeBlock language="php">{`
try {
    $client->publish('orders.99', 'order.paid', $data);
} catch (\\GatewaySDK\\Exception\\PublishException $e) {
    error_log('Gateway publish failed: ' . $e->getMessage());
} catch (\\GatewaySDK\\Exception\\RateLimitException $e) {
    // Retry after delay
    sleep(5);
}
      `}</CodeBlock>
    </>),
  },
  "browser-sdk": {
    toc: [
      { id: "embedding", title: "Embedding" },
      { id: "api", title: "API Reference" },
      { id: "mini-example", title: "Complete Example" },
    ],
    render: () => (<>
      <h2 id="embedding">Embedding the GatewayClient</h2>
      <p>The Gateway server serves a minified JavaScript SDK at <code>/sdk/gateway.js</code>. This is a self-contained ES5 class — no dependencies.</p>
      <CodeBlock language="html">{`
<script src="http://localhost:4000/sdk/gateway.js"></script>
      `}</CodeBlock>
      <p>This exposes <code>window.GatewayClient</code>.</p>
      <h2 id="api">API Reference</h2>
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>new GatewayClient(&#123;host, autoReconnect&#125;)</code></td><td>Create client.</td></tr>
          <tr><td><code>.connect(token)</code></td><td>Open WebSocket with JWT.</td></tr>
          <tr><td><code>.disconnect()</code></td><td>Close connection.</td></tr>
          <tr><td><code>.subscribe(name, options?)</code></td><td>Subscribe to channel. Returns <code>GatewayChannel</code>.</td></tr>
          <tr><td><code>.unsubscribe(name)</code></td><td>Leave channel.</td></tr>
          <tr><td><code>.on(event, handler)</code></td><td>Listen for global events.</td></tr>
          <tr><td><code>.off(event, handler)</code></td><td>Remove listener.</td></tr>
        </tbody>
      </table>
      <code>GatewayChannel</code> methods:
      <table>
        <thead><tr><th>Method</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>.on(event, handler)</code></td><td>Listen for events on this channel.</td></tr>
          <tr><td><code>.off(event, handler)</code></td><td>Remove channel listener.</td></tr>
          <tr><td><code>.unsubscribe()</code></td><td>Leave this channel.</td></tr>
        </tbody>
      </table>
      <h2 id="mini-example">Complete Example</h2>
      <CodeBlock language="html">{`
<!DOCTYPE html>
<html>
<body>
  <div id="events"></div>
  <script src="http://localhost:4000/sdk/gateway.js"></script>
  <script>
    (async () => {
      const res = await fetch('/api/socket/token')
      const { token } = await res.json()

      const gw = new GatewayClient({ host: 'http://localhost:4000' })
      gw.on('connected', () => {
        const ch = gw.subscribe('orders')
        ch.on('order.paid', (data) => {
          document.getElementById('events').innerHTML +=
            \`<p>Order #\${data.order_id}: Rp \${data.amount}</p>\`
        })
      })
      gw.connect(token)
    })()
  </script>
</body>
</html>
      `}</CodeBlock>
    </>),
  },

  // ──────────────────────────────────────────────
  // API REFERENCE
  // ──────────────────────────────────────────────
  "api-reference": {
    toc: [
      { id: "base-url", title: "Base URL & Auth" },
      { id: "errors", title: "Error Responses" },
      { id: "pagination", title: "Pagination" },
    ],
    render: () => (<>
      <h2 id="base-url">Base URL & Auth</h2>
      <p>Base URL: <code>http://localhost:3000/api/v1</code></p>
      <p>All endpoints require session cookie (<code>gateway_session</code>) or <code>X-App-Key</code> + <code>X-Signature</code> headers.</p>
      <h2 id="errors">Error Responses</h2>
      <table>
        <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td>400</td><td>Missing required fields.</td></tr>
          <tr><td>401</td><td>Authentication required.</td></tr>
          <tr><td>403</td><td>Invalid signature or insufficient permissions.</td></tr>
          <tr><td>404</td><td>Resource not found.</td></tr>
          <tr><td>422</td><td>Invalid event name or channel format.</td></tr>
          <tr><td>429</td><td>Rate limit exceeded.</td></tr>
        </tbody>
      </table>
      <h2 id="pagination">Pagination</h2>
      <p>List endpoints accept <code>page</code> (default 1) and <code>per_page</code> (default 20-50) query params. Response includes <code>{`{"meta": {"page": 1, "per_page": 20, "total": 284}}`}</code>.</p>
    </>),
  },
  "api-apps": {
    toc: [
      { id: "list", title: "List Apps" },
      { id: "get", title: "Get App" },
      { id: "create", title: "Create App" },
      { id: "rotate-secret", title: "Rotate Secret" },
      { id: "get-secret", title: "Get Secret" },
    ],
    render: () => (<>
      <h2 id="list">List Apps</h2>
      <CodeBlock language="bash">{`
GET /api/v1/apps?status=active&page=1&per_page=20
      `}</CodeBlock>
      <APIParam name="status" type="string">Filter: active, inactive, or all.</APIParam>
      <APIParam name="search" type="string">Search by app name or ID.</APIParam>
      <APIParam name="sort" type="string">Sort by: name, status, connections, events.</APIParam>
      <h2 id="get">Get App</h2>
      <CodeBlock language="bash">{`
GET /api/v1/apps/:id
      `}</CodeBlock>
      <h2 id="create">Create App</h2>
      <CodeBlock language="bash">{`
POST /api/v1/apps
Content-Type: application/json

{ "name": "My App", "environment": "production" }
      `}</CodeBlock>
      <APIParam name="name" type="string" required>App name (max 100 chars).</APIParam>
      <APIParam name="environment" type="string">production, staging, development, testing.</APIParam>
      <h2 id="rotate-secret">Rotate Secret</h2>
      <CodeBlock language="bash">{`
POST /api/v1/apps/:id/rotate-secret
      `}</CodeBlock>
      <p>Generates a new App Secret. Old secret immediately invalidated.</p>
      <h2 id="get-secret">Get Secret</h2>
      <CodeBlock language="bash">{`
GET /api/v1/apps/:id/secret
      `}</CodeBlock>
      <Callout type="warning">The secret is only shown once after creation. Store it securely.</Callout>
    </>),
  },
  "api-events": {
    toc: [
      { id: "publish", title: "Publish Event" },
      { id: "batch", title: "Batch Publish" },
      { id: "list", title: "List Events" },
      { id: "get", title: "Get Event" },
    ],
    render: () => (<>
      <h2 id="publish">Publish Event</h2>
      <CodeBlock language="bash">{`
POST /api/v1/events
Content-Type: application/json

{
  "channel": "orders.99",
  "event": "order.paid",
  "data": { "order_id": 99, "amount": 250000 },
  "socket_id": "ws_abc..."   // optional: exclude this socket
}
      `}</CodeBlock>
      <APIParam name="channel" type="string" required>Target channel name.</APIParam>
      <APIParam name="event" type="string" required>Event name (dot-notation).</APIParam>
      <APIParam name="data" type="object" required>Arbitrary payload, max 10KB.</APIParam>
      <APIParam name="socket_id" type="string">Exclude this socket from receiving the event.</APIParam>
      <h2 id="batch">Batch Publish</h2>
      <CodeBlock language="bash">{`
POST /api/v1/events/batch
Content-Type: application/json

{
  "batch": [
    { "channel": "orders.99", "event": "order.paid", "data": { "id": 1 } },
    { "channel": "orders.99", "event": "order.shipped", "data": { "id": 2 } }
  ]
}
      `}</CodeBlock>
      <p>Response: <code>{`{"published": 2, "failed": 0, "results": [...]}`}</code>. Max 100 per batch.</p>
      <h2 id="list">List Events</h2>
      <CodeBlock language="bash">{`
GET /api/v1/events?channel=orders.99&event=order.paid&range=24h&page=1
      `}</CodeBlock>
      <APIParam name="channel" type="string">Filter by channel.</APIParam>
      <APIParam name="event" type="string">Filter by event name.</APIParam>
      <APIParam name="range" type="string">Time range: 30m, 1h, 24h.</APIParam>
      <h2 id="get">Get Event</h2>
      <CodeBlock language="bash">{`
GET /api/v1/events/:id
      `}</CodeBlock>
    </>),
  },
  "api-connections": {
    toc: [
      { id: "list", title: "List Connections" },
      { id: "get", title: "Get Connection" },
      { id: "disconnect", title: "Disconnect" },
    ],
    render: () => (<>
      <h2 id="list">List Connections</h2>
      <CodeBlock language="bash">{`
GET /api/v1/connections?app_id=app_a1b2c&state=live
      `}</CodeBlock>
      <APIParam name="app_id" type="string">Filter by app.</APIParam>
      <APIParam name="state" type="string">Filter: live, idle.</APIParam>
      <APIParam name="search" type="string">Search by socket_id, user_id, or IP.</APIParam>
      <h2 id="get">Get Connection Detail</h2>
      <CodeBlock language="bash">{`
GET /api/v1/connections/:socket_id
      `}</CodeBlock>
      <p>Returns full connection detail including subscribed channels and recent events.</p>
      <h2 id="disconnect">Disconnect Socket</h2>
      <CodeBlock language="bash">{`
DELETE /api/v1/connections/:socket_id
      `}</CodeBlock>
      <p>Forcefully closes the WebSocket connection.</p>
    </>),
  },
  "api-webhooks": {
    toc: [
      { id: "list-logs", title: "List Webhook Logs" },
      { id: "get-log", title: "Get Log Detail" },
      { id: "retry", title: "Retry Delivery" },
    ],
    render: () => (<>
      <h2 id="list-logs">List Webhook Logs</h2>
      <CodeBlock language="bash">{`
GET /api/v1/webhooks/logs?app_id=app_a1b2c&status=error&range=24h
      `}</CodeBlock>
      <APIParam name="app_id" type="string">Filter by app.</APIParam>
      <APIParam name="status" type="string">Filter: ok, error, dead, retrying.</APIParam>
      <APIParam name="range" type="string">Time range: 30m, 1h, 24h, 7d.</APIParam>
      <h2 id="get-log">Get Log Detail</h2>
      <CodeBlock language="bash">{`
GET /api/v1/webhooks/logs/:id
      `}</CodeBlock>
      <p>Returns payload sent, response status, latency, and all retry attempts.</p>
      <h2 id="retry">Retry Delivery</h2>
      <CodeBlock language="bash">{`
POST /api/v1/webhooks/logs/:id/retry
      `}</CodeBlock>
      <p>Manually retry a dead delivery.</p>
    </>),
  },

  // ──────────────────────────────────────────────
  // OPERATIONS
  // ──────────────────────────────────────────────
  "env-vars": {
    toc: [
      { id: "gateway-vars", title: "Gateway Server" },
      { id: "dashboard-vars", title: "Dashboard" },
      { id: "saas-vars", title: "SaaS Cloud" },
    ],
    render: () => (<>
      <h2 id="gateway-vars">Gateway Server (Go)</h2>
      <table>
        <thead><tr><th>Variable</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>PORT</code></td><td>No</td><td>4000</td><td>HTTP listen port.</td></tr>
          <tr><td><code>REDIS_URL</code></td><td>Yes</td><td>—</td><td>Redis connection (e.g. <code>redis://localhost:6379</code>).</td></tr>
          <tr><td><code>JWT_SECRET</code></td><td>Yes</td><td>—</td><td>HMAC-SHA256 key. Min 64 chars. Generate with <code>openssl rand -hex 32</code>.</td></tr>
          <tr><td><code>ALLOWED_ORIGINS</code></td><td>Yes</td><td>—</td><td>Comma-separated CORS origins. Use <code>*</code> for dev only.</td></tr>
          <tr><td><code>LOG_LEVEL</code></td><td>No</td><td>info</td><td>zerolog: debug, info, warn, error.</td></tr>
        </tbody>
      </table>
      <h2 id="dashboard-vars">Dashboard (Next.js)</h2>
      <table>
        <thead><tr><th>Variable</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>NEXT_PUBLIC_API_URL</code></td><td>No</td><td>—</td><td>Base URL for API calls.</td></tr>
          <tr><td><code>NEXT_PUBLIC_WS_URL</code></td><td>No</td><td>—</td><td>WebSocket URL for playground.</td></tr>
          <tr><td><code>JWT_SECRET</code></td><td>No</td><td>fallback</td><td>Must match gateway server's <code>JWT_SECRET</code> for token generation.</td></tr>
        </tbody>
      </table>
      <h2 id="saas-vars">SaaS Cloud</h2>
      <table>
        <thead><tr><th>Variable</th><th>Required</th><th>Default</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code>DATABASE_URL</code></td><td>Yes</td><td>—</td><td>PostgreSQL connection string.</td></tr>
          <tr><td><code>REDIS_URL</code></td><td>Yes</td><td>—</td><td>Redis for pub/sub + rate limiting.</td></tr>
          <tr><td><code>JWT_SECRET</code></td><td>Yes</td><td>—</td><td>HMAC signing key.</td></tr>
          <tr><td><code>ALLOWED_ORIGINS</code></td><td>Yes</td><td>—</td><td>CORS origins.</td></tr>
          <tr><td><code>STRIPE_SECRET_KEY</code></td><td>No</td><td>—</td><td>Stripe secret key for billing.</td></tr>
          <tr><td><code>STRIPE_WEBHOOK_SECRET</code></td><td>No</td><td>—</td><td>Stripe webhook signing secret.</td></tr>
        </tbody>
      </table>
    </>),
  },
  deployment: {
    toc: [
      { id: "docker-compose", title: "Docker Compose" },
      { id: "nginx", title: "Nginx Reverse Proxy" },
      { id: "pm2", title: "PM2" },
      { id: "checklist", title: "Pre-Production Checklist" },
    ],
    render: () => (<>
      <h2 id="docker-compose">Docker Compose</h2>
      <CodeBlock language="bash">{`
# Build & start
docker compose up -d --build

# View logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down
      `}</CodeBlock>
      <h2 id="nginx">Nginx Reverse Proxy</h2>
      <CodeBlock language="nginx">{`
server {
    server_name gateway.internal;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_buffering off;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }

    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 3600s;
    }

    location /sdk/ { proxy_pass http://localhost:4000; }
    location /metrics { proxy_pass http://localhost:4000; }
    location /api/socket/ { proxy_pass http://localhost:4000; }
}
      `}</CodeBlock>
      <h2 id="pm2">PM2 Process Manager</h2>
      <CodeBlock language="bash">{`
# Frontend
pm2 start npm --name "gateway-frontend" -- run start

# Backend Go
pm2 start ./backend_go/gateway-server --name "gateway-backend"

# Save and auto-start on boot
pm2 save
pm2 startup
      `}</CodeBlock>
      <h2 id="checklist">Pre-Production Checklist</h2>
      <ul>
        <li><code>JWT_SECRET</code> is a strong random 64+ character string.</li>
        <li><code>ALLOWED_ORIGINS</code> is not <code>*</code> — explicit list of trusted origins.</li>
        <li>Redis has persistence enabled (<code>appendonly yes</code>).</li>
        <li>Nginx is configured with HTTPS (Let's Encrypt).</li>
        <li>Health check endpoint is monitored (<code>/health</code>).</li>
        <li>All 28 tests pass: <code>npm run test:socket</code>.</li>
        <li>TypeScript compiles: <code>npm run typecheck</code>.</li>
        <li>Go build succeeds: <code>go build -o gateway-server .</code>.</li>
      </ul>
    </>),
  },
  scaling: {
    toc: [
      { id: "horizontal", title: "Horizontal Scaling" },
      { id: "redis", title: "Redis as Message Bus" },
      { id: "load-balancer", title: "Load Balancer" },
      { id: "sticky-sessions", title: "Sticky Sessions" },
    ],
    render: () => (<>
      <h2 id="horizontal">Horizontal Scaling</h2>
      <p>Gateway is designed for horizontal scaling. Run multiple instances behind a load balancer — they all connect to the same Redis instance for cross-instance message routing.</p>
      <CodeBlock language="text">{`
        ┌─────────────┐
        │  LB (:4000)  │
        └──┬──────┬───┘
           │      │
    ┌──────▼─┐  ┌─▼──────┐
    │ GW #1  │  │ GW #2  │
    └───┬────┘  └───┬────┘
        │           │
        └─────┬─────┘
         ┌────▼────┐
         │  Redis   │
         └─────────┘
      `}</CodeBlock>
      <h2 id="redis">Redis as Message Bus</h2>
      <p>Each instance subscribes to Redis patterns (<code>events.*</code>, <code>notif.*</code>). When an event is published via:</p>
      <ul>
        <li><strong>REST API</strong> — the handling instance publishes to Redis.</li>
        <li><strong>Direct Redis</strong> — all instances receive it via pub/sub.</li>
      </ul>
      <p>This means a client connected to Instance A receives events published to Instance B seamlessly.</p>
      <h2 id="load-balancer">Load Balancer</h2>
      <CodeBlock language="nginx">{`
upstream gateway_ws {
    server gateway-1:4000;
    server gateway-2:4000;
    server gateway-3:4000;
}
      `}</CodeBlock>
      <h2 id="sticky-sessions">Sticky Sessions</h2>
      <Callout type="info">Sticky sessions are recommended but not required. Without stickiness, user-targeted notifications (via <code>notif.userId</code> pattern) won't reach clients on other instances.</Callout>
      <p>With sticky sessions, a single user always connects to the same instance. User notifications are local. Channel broadcasts still work across all instances via Redis.</p>
    </>),
  },
  "security": {
    toc: [
      { id: "overview", title: "Security Model" },
      { id: "session", title: "Session Tokens" },
      { id: "app-secrets", title: "App Secrets" },
      { id: "csrf", title: "CSRF Protection" },
      { id: "hmac", title: "HMAC Verification" },
      { id: "checklist", title: "Production Checklist" },
    ],
    render: () => (<>
      <h2 id="overview">Security Model</h2>
      <p>Gateway Realtime uses multiple layers of cryptographic protection. Every authentication path is independently secured.</p>
      <table><thead><tr><th>Layer</th><th>Mechanism</th></tr></thead><tbody><tr><td>Dashboard Login</td><td>Signed JWT cookie (HMAC-SHA256)</td></tr><tr><td>WebSocket Handshake</td><td>JWT in cookie or header (HMAC-SHA256)</td></tr><tr><td>REST API Publish</td><td>HMAC-SHA256 (X-App-Key + X-Signature)</td></tr><tr><td>Private Channels</td><td>HMAC-SHA256 channel auth</td></tr><tr><td>Webhook Delivery</td><td>HMAC-SHA256 signature</td></tr><tr><td>Mutation Endpoints</td><td>CSRF token</td></tr></tbody></table>
      <h2 id="session">Session Tokens</h2>
      <p>Dashboard authentication uses <strong>signed JWT cookies</strong> with HMAC-SHA256 and timing-safe verification — not plain base64.</p>
      <Callout type="info">Replace the demo user store with a real database and bcrypt for production.</Callout>
      <h2 id="app-secrets">App Secrets</h2>
      <p>Secrets are loaded from <code>GATEWAY_APP_SECRETS</code> environment variable. No secrets in the codebase.</p>
      <CodeBlock language="bash">{`
GATEWAY_APP_SECRETS=app_id:pk_live_xxx:sk_live_yyy
      `}</CodeBlock>
      <Callout type="warning">Never commit .env files. Rotate secrets immediately if exposed.</Callout>
      <h2 id="csrf">CSRF Protection</h2>
      <p>Mutation endpoints require CSRF token from <code>GET /api/v1/settings</code> in the <code>X-CSRF-Token</code> header.</p>
      <h2 id="hmac">HMAC Signature Verification</h2>
      <p>All HMAC comparisons use timing-safe operations: hmac.Equal (Go), crypto.timingSafeEqual (TypeScript).</p>
      <h2 id="checklist">Production Checklist</h2>
      <table><thead><tr><th>#</th><th>Check</th><th>Status</th></tr></thead><tbody><tr><td>1</td><td>JWT_SECRET 64+ random chars</td><td>Required</td></tr><tr><td>2</td><td>ALLOWED_ORIGINS explicit list</td><td>Required</td></tr><tr><td>3</td><td>GATEWAY_APP_SECRETS configured</td><td>Required</td></tr><tr><td>4</td><td>HTTPS/TLS (nginx + Let` + "'" + `s Encrypt)</td><td>Required</td></tr><tr><td>5</td><td>Security headers active</td><td>Built-in</td></tr><tr><td>6</td><td>CSRF tokens on all mutations</td><td>Built-in</td></tr><tr><td>7</td><td>Demo auth replaced with real DB</td><td>Production</td></tr><tr><td>8</td><td>Rate limiting (SaaS Cloud)</td><td>Optional</td></tr></tbody></table>
      <p>Report vulnerabilities: <a href="https://github.com/sanhaji182/gateway_realtime/security">GitHub Security</a>.</p>
    </>),
  },
  "saas-extensions": {
    toc: [
      { id: "overview", title: "Open-Core Architecture" },
      { id: "authenticator", title: "Authenticator" },
      { id: "ratelimiter", title: "Rate Limiter" },
      { id: "eventhook", title: "Event Hook" },
      { id: "injection", title: "Extension Injection" },
    ],
    render: () => (<>
      <h2 id="overview">Open-Core Architecture</h2>
      <p>Gateway Realtime uses <strong>extension points</strong> to add SaaS features without modifying the MIT-licensed core. Three interfaces:</p>
      <CodeBlock language="go">{`
type ExtensionPoints struct {
    Auth        Authenticator   // multi-tenant, OAuth, API keys
    RateLimiter RateLimiter     // plan-based rate limits
    EventHook   EventHook       // billing, analytics, audit
}
      `}</CodeBlock>
      <h2 id="authenticator">Authenticator</h2>
      <p>Validate X-Tenant-Key headers against PostgreSQL:</p>
      <CodeBlock language="go">{`
type Authenticator interface {
    Authenticate(r *http.Request) (userID, tenantID string, ok bool)
}
      `}</CodeBlock>
      <h2 id="ratelimiter">Rate Limiter</h2>
      <p>Redis token bucket: Free 100/min, Pro 10k/min, Enterprise 100k/min.</p>
      <h2 id="eventhook">Event Hook</h2>
      <p>Track OnConnect, OnDisconnect, OnSubscribe, OnUnsubscribe, OnPublish for billing.</p>
      <h2 id="injection">Extension Injection</h2>
      <p>Build a SaaS binary that injects implementations:</p>
      <CodeBlock language="go">{`
mux.Handle("/ws", handler.WSHandler{
    Auth:        cloud.TenantAuthenticator{DB: db},
    RateLimiter: cloud.PlanRateLimiter{Redis: rdb, DB: db},
    EventHook:   cloud.NewUsageTracker(db),
})
      `}</CodeBlock>
      <p>Core Gateway upgrades independently — interface signatures are the contract.</p>
    </>),
  },
  "changelog": {
    toc: [
      { id: "v032", title: "v0.3.2 — Security" },
      { id: "v030", title: "v0.3.0 — Docs & DX" },
      { id: "v020", title: "v0.2.0 — Open Source" },
      { id: "v010", title: "v0.1.0 — Initial" },
    ],
    render: () => (<>
      <p>Full changelog: <a href="https://github.com/sanhaji182/gateway_realtime/blob/master/CHANGELOG.md">CHANGELOG.md on GitHub</a>.</p>
      <h2 id="v032">v0.3.2 — Security Release</h2>
      <ul><li>Session: base64 → signed JWT (HMAC-SHA256, timing-safe verify)</li><li>Secrets: hardcoded → GATEWAY_APP_SECRETS env var</li><li>WS auth: cookie-first, query param fallback</li><li>CSRF protection on mutation endpoints</li></ul>
      <h2 id="v030">v0.3.0 — Docs & Developer Experience</h2>
      <ul><li>27-page docs portal: tutorials, API, operations, security</li><li>Bilingual README (EN + ID)</li><li>SaaS Frontend (landing, signup, login, dashboard)</li></ul>
      <h2 id="v020">v0.2.0 — Open-Source Ready</h2>
      <ul><li>MIT license, CODE_OF_CONDUCT, SECURITY</li><li>CI/CD pipeline</li><li>SaaS extension points (Authenticator, RateLimiter, EventHook)</li></ul>
      <h2 id="v010">v0.1.0 — Initial Release</h2>
      <ul><li>Next.js 16 Dashboard (9 routes)</li><li>Go WebSocket Gateway (Redis pub/sub, JWT)</li><li>TypeScript SDK (28 tests)</li><li>PHP SDK, webhooks, Docker Compose</li></ul>
    </>),
  },
    troubleshooting: {
    toc: [
      { id: "connection-refused", title: "WebSocket Connection Refused" },
      { id: "jwt-invalid", title: "JWT Invalid / Expired" },
      { id: "channel-forbidden", title: "Channel Subscription Failed" },
      { id: "redis-down", title: "Redis Connection Failed" },
      { id: "cors-errors", title: "CORS Errors" },
      { id: "slow-publish", title: "Slow Event Publishing" },
    ],
    render: () => (<>
      <h2 id="connection-refused">WebSocket Connection Refused</h2>
      <p><strong>Symptom:</strong> <code>WebSocket connection to 'ws://...' failed</code>.</p>
      <ul>
        <li>Check the gateway server is running: <code>curl http://localhost:4000/health</code>.</li>
        <li>Verify <code>ALLOWED_ORIGINS</code> includes your frontend origin.</li>
        <li>Check firewall rules allow port 4000.</li>
        <li>Verify the JWT token is valid and not expired.</li>
      </ul>
      <h2 id="jwt-invalid">JWT Invalid / Expired</h2>
      <p><strong>Symptom:</strong> <code>401 unauthorized</code> on WebSocket handshake.</p>
      <ul>
        <li>Ensure <code>JWT_SECRET</code> is identical on both dashboard and gateway server.</li>
        <li>Check token expiry — default is 24 hours. Re-fetch from <code>/api/socket/token</code>.</li>
        <li>Verify JWT contains <code>user_id</code> or <code>sub</code> claim.</li>
      </ul>
      <h2 id="channel-forbidden">Channel Subscription Failed</h2>
      <p><strong>Symptom:</strong> <code>subscription_error</code> with code <code>FORBIDDEN</code>.</p>
      <ul>
        <li><strong>Private/presence:</strong> Auth signature missing or invalid. Check your <code>/api/socket/auth</code> endpoint.</li>
        <li><strong>Wildcard (<code>.*</code>):</strong> Requires admin role in JWT.</li>
        <li><strong>Invalid name:</strong> Channel must match <code>^[a-z0-9]+([.-][a-z0-9]+)*</code>.</li>
      </ul>
      <h2 id="redis-down">Redis Connection Failed</h2>
      <p><strong>Symptom:</strong> <code>redis ping failed</code> in startup logs, events not propagating across instances.</p>
      <ul>
        <li>Verify Redis is running: <code>redis-cli ping</code>.</li>
        <li>Check <code>REDIS_URL</code> is correct.</li>
        <li>Gateway continues to serve local WebSocket connections without Redis, but cross-instance events won't work.</li>
      </ul>
      <h2 id="cors-errors">CORS Errors</h2>
      <p><strong>Symptom:</strong> Browser console shows <code>Access-Control-Allow-Origin</code> errors.</p>
      <ul>
        <li>Add your frontend origin to <code>ALLOWED_ORIGINS</code> (comma-separated).</li>
        <li>Don't use <code>*</code> in production — browsers reject <code>*</code> with credentials.</li>
        <li>Check for trailing slashes — <code>http://localhost:3000</code> ≠ <code>http://localhost:3000/</code>.</li>
      </ul>
      <h2 id="slow-publish">Slow Event Publishing</h2>
      <p><strong>Symptom:</strong> Events take longer than 500ms to reach subscribers.</p>
      <ul>
        <li>Check Redis latency: <code>redis-cli --latency</code>.</li>
        <li>Check network latency between services.</li>
        <li>Verify Redis is on the same network/VPC as gateway instances.</li>
        <li>Consider direct Redis publish for lowest latency (bypass REST API).</li>
      </ul>
    </>),
  },
};

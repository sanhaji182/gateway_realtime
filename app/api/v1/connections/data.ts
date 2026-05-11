import type { ConnectionDetail, ConnectionItem } from "@/lib/api";

const now = Date.now();

export const connections: ConnectionDetail[] = [
  {
    socket_id: "ws_a1b2c3d4e5",
    app_id: "app_a1b2c",
    app_name: "marketplace",
    user_id: "u-881",
    ip: "10.0.1.4",
    channels: ["orders.99", "chat.55"],
    channel_count: 2,
    connected_at: new Date(now - 18 * 60 * 1000).toISOString(),
    last_seen_at: new Date(now - 2 * 1000).toISOString(),
    state: "live",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    subscribed_channels: [
      { name: "orders.99", joined_at: new Date(now - 17 * 60 * 1000).toISOString() },
      { name: "chat.55", joined_at: new Date(now - 12 * 60 * 1000).toISOString() }
    ],
    recent_events: [
      { ts: new Date(now - 20 * 1000).toISOString(), event: "order.paid", channel: "orders.99" },
      { ts: new Date(now - 72 * 1000).toISOString(), event: "message.sent", channel: "chat.55" }
    ]
  },
  {
    socket_id: "ws_f6g7h8i9j0",
    app_id: "app_ops",
    app_name: "ops",
    user_id: "u-104",
    ip: "10.0.2.18",
    channels: ["alerts"],
    channel_count: 1,
    connected_at: new Date(now - 7 * 60 * 1000).toISOString(),
    last_seen_at: new Date(now - 48 * 1000).toISOString(),
    state: "idle",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    subscribed_channels: [{ name: "alerts", joined_at: new Date(now - 6 * 60 * 1000).toISOString() }],
    recent_events: [{ ts: new Date(now - 3 * 60 * 1000).toISOString(), event: "alert.created", channel: "alerts" }]
  },
  {
    socket_id: "ws_k1l2m3n4o5",
    app_id: "app_a1b2c",
    app_name: "marketplace",
    user_id: "",
    ip: "2001:db8::4",
    channels: ["presence.market"],
    channel_count: 1,
    connected_at: new Date(now - 90 * 1000).toISOString(),
    last_seen_at: new Date(now - 1 * 1000).toISOString(),
    state: "live",
    user_agent: "Gateway JS Client/1.0",
    subscribed_channels: [{ name: "presence.market", joined_at: new Date(now - 80 * 1000).toISOString() }],
    recent_events: []
  }
];

export function listConnections(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const appId = searchParams.get("app_id") ?? "";
  const state = searchParams.get("state") ?? "";
  const channel = searchParams.get("channel")?.toLowerCase() ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 50);
  const filtered = connections
    .filter((item) => !search || item.socket_id.toLowerCase().includes(search) || item.user_id.toLowerCase().includes(search) || item.ip.toLowerCase().includes(search))
    .filter((item) => !appId || item.app_id === appId)
    .filter((item) => !state || item.state === state)
    .filter((item) => !channel || item.channels.some((name) => name.toLowerCase().includes(channel)));
  const start = (page - 1) * perPage;
  const data: ConnectionItem[] = filtered.slice(start, start + perPage).map(({ user_agent, subscribed_channels, recent_events, ...item }) => item);
  return { data, meta: { page, per_page: perPage, total: filtered.length } };
}

export function findConnection(socketId: string) {
  return connections.find((item) => item.socket_id === socketId) ?? null;
}

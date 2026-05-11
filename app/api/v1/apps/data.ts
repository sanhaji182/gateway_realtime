import type { AppDetail, AppListItem, AppStats, EventItem, TrafficPoint, WebhookEndpoint } from "@/lib/api";

export const apps: AppListItem[] = [
  { id: "app_a1b2c", name: "marketplace", status: "active", connections: 284, events_today: 12481, webhook_status: "ok", updated_at: "2026-05-05T14:22:00Z" },
  { id: "app_ops", name: "ops", status: "active", connections: 42, events_today: 3188, webhook_status: "degraded", updated_at: "2026-05-05T13:54:00Z" },
  { id: "app_chat", name: "chat", status: "inactive", connections: 0, events_today: 108, webhook_status: "none", updated_at: "2026-05-05T09:12:00Z" }
];

export const details: Record<string, AppDetail> = {
  app_a1b2c: { id: "app_a1b2c", name: "marketplace", status: "active", key: "pk_live_a1b2c3", secret: null, allowed_origins: ["https://marketplace.internal", "https://admin.marketplace.internal"], webhook_endpoints: [{ id: "wh_1", url: "https://api.internal/hook", events: ["*"], status: "ok" }], created_at: "2026-01-01T00:00:00Z" },
  app_ops: { id: "app_ops", name: "ops", status: "active", key: "pk_live_ops123", secret: null, allowed_origins: ["https://ops.internal"], webhook_endpoints: [{ id: "wh_2", url: "https://ops.internal/hook", events: ["alert.*"], status: "degraded" }], created_at: "2026-02-02T00:00:00Z" },
  app_chat: { id: "app_chat", name: "chat", status: "inactive", key: "pk_live_chat99", secret: null, allowed_origins: [], webhook_endpoints: [], created_at: "2026-03-01T00:00:00Z" }
};

export const stats: Record<string, AppStats & { traffic: TrafficPoint[] }> = Object.fromEntries(apps.map((app, appIndex) => [app.id, { peak_connections: { value: app.connections || 12, at: "2026-05-05T10:22:00Z" }, top_channels: [{ name: "orders.#", event_count: 882 - appIndex * 80 }, { name: "chat.#", event_count: 541 - appIndex * 40 }, { name: "alerts", event_count: 218 - appIndex * 20 }], traffic: Array.from({ length: 24 }).map((_, index) => ({ ts: Math.floor(Date.now() / 1000) - (23 - index) * 3600, value: 180 + Math.round(Math.sin(index / 3) * 35) + index * 3 + appIndex * 12 })) }])) as Record<string, AppStats & { traffic: TrafficPoint[] }>;

export const events: Record<string, EventItem[]> = Object.fromEntries(apps.map((app) => [app.id, Array.from({ length: 8 }).map((_, index) => ({ id: `evt_${app.id}_${index}`, app_id: app.id, app_name: app.name, channel: index % 2 === 0 ? "orders.99" : "chat.55", event: index % 2 === 0 ? "order.paid" : "message.sent", source: "ci4-api", size_bytes: 280 + index * 12, status: index === 3 ? "error" : "ok", request_id: `req_${app.id}_${index}`, published_at: new Date(Date.now() - index * 8 * 60 * 1000).toISOString() }))])) as Record<string, EventItem[]>;

export function listApps(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "name";
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const filtered = apps.filter((app) => (!search || app.name.includes(search) || app.id.includes(search))).filter((app) => (!status || status === "all" || app.status === status)).sort((a, b) => sortApps(a, b, sort));
  const start = (page - 1) * perPage;
  return { data: filtered.slice(start, start + perPage), meta: { page, per_page: perPage, total: filtered.length } };
}

function sortApps(a: AppListItem, b: AppListItem, sort: string) {
  if (sort === "connections") return b.connections - a.connections;
  if (sort === "events") return b.events_today - a.events_today;
  if (sort === "status") return a.status.localeCompare(b.status);
  return a.name.localeCompare(b.name);
}

export function findApp(id: string) { return details[id] ?? null; }
export function okWebhook(body: Partial<WebhookEndpoint>) { return { id: body.id ?? `wh_${Date.now()}`, url: body.url ?? "", events: body.events ?? ["*"], status: body.status ?? "ok" }; }

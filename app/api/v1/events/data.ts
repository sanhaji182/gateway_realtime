import type { EventDetail, EventItem, EventStatus, TimeRange } from "@/lib/api";

const apps = [
  { id: "app_a1b2c", name: "marketplace" },
  { id: "app_ops", name: "ops" },
  { id: "app_chat", name: "chat" }
];
const channels = ["orders.99", "chat.55", "alerts", "presence.market", "orders.42"];
const eventNames = ["order.paid", "message.sent", "alert.created", "member.joined", "order.updated"];

export const eventDetails: EventDetail[] = Array.from({ length: 86 }).map((_, index) => {
  const app = apps[index % apps.length];
  const channel = channels[index % channels.length];
  const event = eventNames[index % eventNames.length];
  const status: EventStatus = index % 11 === 0 ? "error" : "ok";
  const publishedAt = new Date(Date.now() - index * 4 * 60 * 1000 - index * 832).toISOString();
  const payload = { order_id: 123 + index, status: status === "ok" ? "paid" : "failed", amount: 150000 + index * 2500, currency: "IDR", buyer_id: `u-${881 + index}` };

  return {
    id: `evt_${String(index + 1).padStart(3, "0")}`,
    app_id: app.id,
    app_name: app.name,
    channel,
    event,
    source: index % 3 === 0 ? "ci4-api" : index % 3 === 1 ? "go-svc" : "worker",
    size_bytes: 280 + index * 17,
    status,
    request_id: `req_${Math.random().toString(16).slice(2, 10)}_${index}`,
    published_at: publishedAt,
    payload,
    delivery: { subscriber_count: status === "ok" ? 3 + (index % 5) : 0, latency_ms: 4 + (index % 18), webhook_triggered: index % 2 === 0, webhook_log_id: index % 2 === 0 ? `whl_${550 + index}` : null },
    raw: { id: `evt_${String(index + 1).padStart(3, "0")}`, app, channel, event, status, request: { source: index % 3 === 0 ? "ci4-api" : "go-svc", idempotency_key: `idem_${index}` }, payload, published_at: publishedAt }
  };
});

export function listEvents(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const appId = searchParams.get("app_id") ?? "";
  const channel = searchParams.get("channel")?.toLowerCase() ?? "";
  const event = searchParams.get("event")?.toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const range = (searchParams.get("range") ?? "1h") as TimeRange;
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 50);
  const cutoff = rangeCutoff(range);
  const filtered = eventDetails
    .filter((item) => new Date(item.published_at).getTime() >= cutoff)
    .filter((item) => !search || item.channel.toLowerCase().includes(search) || item.event.toLowerCase().includes(search) || item.request_id.toLowerCase().includes(search))
    .filter((item) => !appId || item.app_id === appId)
    .filter((item) => !channel || item.channel.toLowerCase().includes(channel))
    .filter((item) => !event || item.event.toLowerCase().includes(event))
    .filter((item) => !status || item.status === status);
  const start = (page - 1) * perPage;
  const data: EventItem[] = filtered.slice(start, start + perPage).map(({ payload, delivery, raw, ...item }) => item);
  return { data, meta: { page, per_page: perPage, total: filtered.length } };
}

export function findEvent(id: string) {
  return eventDetails.find((item) => item.id === id) ?? null;
}

function rangeCutoff(range: TimeRange) {
  const minutes = range === "30m" ? 30 : range === "24h" ? 24 * 60 : 60;
  return Date.now() - minutes * 60 * 1000;
}

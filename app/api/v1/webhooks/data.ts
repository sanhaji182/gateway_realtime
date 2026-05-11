import type { WebhookLogDetail, WebhookLogItem, WebhookLogStatus } from "@/lib/api";

const apps = [
  { id: "app_a1b2c", name: "marketplace", endpoint: "https://api.internal/hook" },
  { id: "app_ops", name: "ops", endpoint: "https://ops.internal/hook" },
  { id: "app_chat", name: "chat", endpoint: "https://chat.internal/webhook" }
];
const events = ["order.paid", "order.updated", "alert.created", "message.sent"];

export const webhookLogs: WebhookLogDetail[] = Array.from({ length: 64 }).map((_, index) => {
  const app = apps[index % apps.length];
  const status: WebhookLogStatus = index % 9 === 0 ? "failed" : index % 7 === 0 ? "retrying" : "success";
  const httpCode = status === "success" ? 200 : status === "retrying" ? 503 : 500;
  const attempt = status === "success" ? 1 : (index % 3) + 1;
  const triggeredAt = new Date(Date.now() - index * 6 * 60 * 1000 - index * 812).toISOString();

  return {
    id: `whl_${551 + index}`,
    app_id: app.id,
    app_name: app.name,
    endpoint_url: app.endpoint,
    event: events[index % events.length],
    status,
    http_code: httpCode,
    latency_ms: status === "failed" && index % 2 === 0 ? 30000 : 120 + index * 4,
    attempt,
    triggered_at: triggeredAt,
    request: {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gateway-Signature": `sha256=${index}abc123` },
      body: { event: events[index % events.length], id: `evt_${index}`, data: { order_id: 123 + index, amount: 150000 } }
    },
    response: status === "failed" && index % 2 === 0 ? null : { status: httpCode, body: status === "success" ? "ok" : "service unavailable", latency_ms: 120 + index * 4 },
    error: status === "success" ? null : status === "retrying" ? "Endpoint returned 503 Service Unavailable; retry scheduled." : "Request timed out while waiting for endpoint response.",
    attempts: Array.from({ length: attempt }).map((_, attemptIndex) => ({ attempt: attemptIndex + 1, at: new Date(new Date(triggeredAt).getTime() + attemptIndex * 60_000).toISOString(), status: attemptIndex + 1 === attempt ? status : "failed", http_code: attemptIndex + 1 === attempt ? httpCode : 500 }))
  };
});

export function listWebhookLogs(searchParams: URLSearchParams) {
  const search = searchParams.get("search")?.toLowerCase() ?? "";
  const appId = searchParams.get("app_id") ?? "";
  const endpoint = searchParams.get("endpoint")?.toLowerCase() ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 50);
  const filtered = webhookLogs
    .filter((item) => !search || item.endpoint_url.toLowerCase().includes(search) || item.event.toLowerCase().includes(search))
    .filter((item) => !appId || item.app_id === appId)
    .filter((item) => !endpoint || item.endpoint_url.toLowerCase().includes(endpoint))
    .filter((item) => !status || item.status === status);
  const start = (page - 1) * perPage;
  const data: WebhookLogItem[] = filtered.slice(start, start + perPage).map(({ request, response, error, attempts, ...item }) => item);
  return { data, meta: { page, per_page: perPage, total: filtered.length } };
}

export function findWebhookLog(id: string) {
  return webhookLogs.find((item) => item.id === id) ?? null;
}

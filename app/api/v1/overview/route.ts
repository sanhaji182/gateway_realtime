import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    data: {
      kpi: {
        active_connections: 1284,
        events_per_minute: 342,
        webhook_success_rate: 99.1,
        error_rate: 0.3
      },
      health: [
        { name: "Gateway", status: "operational", detail: "0 errors in last 1h" },
        { name: "Broker (Redis)", status: "operational", detail: "latency 1ms" },
        { name: "Webhook Worker", status: "degraded", detail: "3 retries pending" }
      ],
      recent_events: [
        { id: "evt_001", app_id: "app_a1b2c", app_name: "marketplace", channel: "orders.99", event: "order.paid", source: "ci4-api", size_bytes: 312, status: "ok", request_id: "req_aa1", published_at: "2026-05-05T14:22:01.842Z" },
        { id: "evt_002", app_id: "app_a1b2c", app_name: "marketplace", channel: "chat.55", event: "message.sent", source: "web", size_bytes: 540, status: "ok", request_id: "req_aa2", published_at: "2026-05-05T14:21:34.402Z" },
        { id: "evt_003", app_id: "app_ops", app_name: "ops", channel: "alerts", event: "alert.created", source: "worker", size_bytes: 188, status: "error", request_id: "req_aa3", published_at: "2026-05-05T14:20:42.100Z" }
      ],
      recent_failures: [
        { id: "whl_551", app_id: "app_a1b2c", app_name: "marketplace", endpoint_url: "https://api.internal/hook", event: "order.paid", status: "failed", http_code: 500, latency_ms: 142, attempt: 3, triggered_at: "2026-05-05T14:22:01.812Z" },
        { id: "whl_552", app_id: "app_ops", app_name: "ops", endpoint_url: "https://ops.internal/hook", event: "alert.created", status: "retrying", http_code: 503, latency_ms: 361, attempt: 2, triggered_at: "2026-05-05T14:18:11.120Z" }
      ]
    }
  });
}

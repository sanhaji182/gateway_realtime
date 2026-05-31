// Webhook delivery NYATA — dipanggil dari publish path.
// Konfigurasi via env GATEWAY_WEBHOOKS (JSON array), contoh:
//   GATEWAY_WEBHOOKS=[{"url":"https://app.example.com/hook","events":["*"],"secret":"whsec_x"}]
// Setiap delivery ditandatangani HMAC-SHA256 (header X-Gateway-Signature) dan
// dicatat ke Redis list "webhook:logs" agar halaman Webhooks menampilkan data nyata.

import { createHmac } from "crypto";
import { getRedis } from "@/lib/redis-client";

type WebhookConfig = { url: string; events: string[]; secret?: string };

export const LOGS_KEY = "webhook:logs";
const LOGS_MAX = 200;
const TIMEOUT_MS = 5000;

function loadWebhooks(): WebhookConfig[] {
  const raw = process.env.GATEWAY_WEBHOOKS;
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((w) => typeof w?.url === "string") : [];
  } catch {
    return [];
  }
}

const webhooks = loadWebhooks();

// Cocokkan nama event dengan pola: "*" (semua), persis, atau prefix "x.*".
function eventMatches(patterns: string[], event: string): boolean {
  return patterns.some((p) => p === "*" || p === event || (p.endsWith(".*") && event.startsWith(p.slice(0, -1))));
}

// Kirim satu request ke endpoint (dengan 1x retry) lalu catat hasilnya.
async function deliverOne(hook: WebhookConfig, channel: string, event: string, body: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hook.secret) {
    headers["X-Gateway-Signature"] = "sha256=" + createHmac("sha256", hook.secret).update(body).digest("hex");
  }

  let attempt = 0;
  let httpCode = 0;
  let ok = false;
  const startedAt = Date.now();
  while (attempt < 2 && !ok) {
    attempt++;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(hook.url, { method: "POST", headers, body, signal: ctrl.signal });
      clearTimeout(timer);
      httpCode = res.status;
      ok = res.ok;
    } catch {
      httpCode = 0; // timeout / koneksi gagal
    }
  }

  const log = {
    id: `whl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    app_id: "",
    app_name: channel,
    endpoint_url: hook.url,
    event,
    status: ok ? "success" : "failed",
    http_code: httpCode,
    latency_ms: Date.now() - startedAt,
    attempt,
    triggered_at: new Date(startedAt).toISOString(),
  };

  const redis = await getRedis();
  if (redis) {
    await redis.pipeline().lpush(LOGS_KEY, JSON.stringify(log)).ltrim(LOGS_KEY, 0, LOGS_MAX - 1).expire(LOGS_KEY, 604800).exec();
  }
}

// dispatchWebhooks mengirim event ke semua webhook yang polanya cocok.
// Dipanggil sekali di sisi publisher sehingga tidak terjadi duplikasi antar node.
export async function dispatchWebhooks(channel: string, event: string, data: unknown): Promise<void> {
  const matched = webhooks.filter((h) => eventMatches(h.events, event));
  if (matched.length === 0) return;
  const body = JSON.stringify({ channel, event, data, ts: Date.now() });
  await Promise.all(matched.map((h) => deliverOne(h, channel, event, body)));
}

// Redis publisher — jembatan REST API Next.js ke pub/sub Go gateway.
// Selain publish, setiap event juga disimpan ke "history:<channel>" (list ber-cap)
// agar client bisa me-replay pesan terakhir lewat fitur message history.

import { getRedis } from "../redis-client";

// Maksimum pesan history yang disimpan per channel (configurable via env).
const HISTORY_MAX = Number(process.env.HISTORY_MAX || 50);
// TTL history (detik) — default 24 jam agar Redis tidak menumpuk selamanya.
const HISTORY_TTL = Number(process.env.HISTORY_TTL || 86400);

export async function publishToRedis(channel: string, event: string, data: unknown): Promise<boolean> {
  try {
    const pub = await getRedis();
    if (!pub) return false;
    const message = JSON.stringify({
      type: "event",
      channel,
      event,
      data,
      ts: Date.now(),
    });
    const historyKey = "history:" + channel;
    const ts = Date.now();
    // Ringkasan event untuk halaman Events dashboard (log lintas-channel, ber-cap).
    const recent = JSON.stringify({
      id: `evt_${ts}_${Math.random().toString(16).slice(2, 8)}`,
      app_id: "", app_name: "", channel, event,
      source: "api", size_bytes: Buffer.byteLength(message),
      status: "ok", request_id: `req_${ts}`, published_at: new Date(ts).toISOString(),
    });
    // Pipeline: simpan ke history (LPUSH), potong ke cap (LTRIM), set TTL, catat recent, lalu publish.
    // Disimpan di sisi publisher agar tidak terduplikasi antar node gateway.
    await pub
      .pipeline()
      .lpush(historyKey, message)
      .ltrim(historyKey, 0, HISTORY_MAX - 1)
      .expire(historyKey, HISTORY_TTL)
      .lpush("events:recent", recent)
      .ltrim("events:recent", 0, 199)
      .expire("events:recent", HISTORY_TTL)
      .publish("events." + channel, message)
      .exec();
    return true;
  } catch {
    return false;
  }
}

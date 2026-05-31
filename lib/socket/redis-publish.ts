// Redis publisher — jembatan REST API Next.js ke pub/sub Go gateway.
// Selain publish, setiap event juga disimpan ke "history:<channel>" (list ber-cap)
// agar client bisa me-replay pesan terakhir lewat fitur message history.

import { getRedis } from "@/lib/redis-client";

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
    // Pipeline: simpan ke history (LPUSH), potong ke cap (LTRIM), set TTL, lalu publish.
    // Disimpan di sisi publisher agar tidak terduplikasi antar node gateway.
    await pub
      .pipeline()
      .lpush(historyKey, message)
      .ltrim(historyKey, 0, HISTORY_MAX - 1)
      .expire(historyKey, HISTORY_TTL)
      .publish("events." + channel, message)
      .exec();
    return true;
  } catch {
    return false;
  }
}

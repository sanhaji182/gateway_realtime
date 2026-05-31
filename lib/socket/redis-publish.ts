// Redis publisher — jembatan REST API Next.js ke pub/sub Go gateway.
// Hanya aktif jika env REDIS_URL diset.
// Selain publish, setiap event juga disimpan ke "history:<channel>" (list ber-cap)
// agar client bisa me-replay pesan terakhir lewat fitur message history.

import type { Redis } from "ioredis";

let publisher: Redis | null = null;

// Maksimum pesan history yang disimpan per channel (configurable via env).
const HISTORY_MAX = Number(process.env.HISTORY_MAX || 50);
// TTL history (detik) — default 24 jam agar Redis tidak menumpuk selamanya.
const HISTORY_TTL = Number(process.env.HISTORY_TTL || 86400);

async function getPublisher(): Promise<Redis | null> {
  if (publisher) return publisher;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    // Dynamic import — hanya dimuat saat dibutuhkan.
    const { Redis } = await import("ioredis");
    const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await client.connect();
    publisher = client;
    return publisher;
  } catch {
    return null;
  }
}

export async function publishToRedis(channel: string, event: string, data: unknown): Promise<boolean> {
  try {
    const pub = await getPublisher();
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

// Klien Redis bersama (lazy connect) untuk sisi server dashboard.
// Dipakai oleh publish, history, recent events, dan webhook logs agar tidak
// membuka banyak koneksi terpisah.
import type { Redis } from "ioredis";

let client: Redis | null = null;

export async function getRedis(): Promise<Redis | null> {
  if (client) return client;
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    const { Redis } = await import("ioredis");
    const c = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await c.connect();
    client = c;
    return client;
  } catch {
    return null;
  }
}

// Redis publisher — bridges Next.js REST API to Go gateway pub/sub
// Only active when REDIS_URL env var is set

let publisher: { publish(channel: string, message: string): Promise<unknown> } | null = null;

async function getPublisher() {
  if (publisher) return publisher;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  try {
    // Dynamic import — only loads when needed
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
    // Publish to the events channel pattern that Go gateway subscribes to
    await pub.publish("events." + channel, message);
    return true;
  } catch {
    return false;
  }
}

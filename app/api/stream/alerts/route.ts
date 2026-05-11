export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const alert = { id: "system-webhook-worker", severity: "warning", message: "Webhook Worker degraded: 3 retries pending" };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(alert)}\n\n`));
      const keepAlive = setInterval(() => controller.enqueue(encoder.encode(": keep-alive\n\n")), 30_000);
      return () => clearInterval(keepAlive);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

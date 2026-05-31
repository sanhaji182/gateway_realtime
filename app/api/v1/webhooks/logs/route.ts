import { NextRequest, NextResponse } from "next/server";
import { listWebhookLogs } from "@/app/api/v1/webhooks/data";
import { getRedis } from "@/lib/redis-client";
import { LOGS_KEY } from "@/lib/webhooks";
import type { WebhookLogItem } from "@/lib/api";

export async function GET(request: NextRequest) {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.lrange(LOGS_KEY, 0, 499).catch(() => [] as string[]);
    if (raw.length > 0) {
      const sp = request.nextUrl.searchParams;
      const status = sp.get("status") ?? "";
      const search = sp.get("search")?.toLowerCase() ?? "";
      const all = raw
        .map((s) => { try { return JSON.parse(s) as WebhookLogItem; } catch { return null; } })
        .filter((x): x is WebhookLogItem => x !== null)
        .filter((x) => !status || x.status === status)
        .filter((x) => !search || x.endpoint_url.toLowerCase().includes(search) || x.event.toLowerCase().includes(search));
      const page = Number(sp.get("page") ?? 1);
      const perPage = Number(sp.get("per_page") ?? 50);
      const start = (page - 1) * perPage;
      return NextResponse.json({ data: all.slice(start, start + perPage), meta: { page, per_page: perPage, total: all.length } });
    }
  }
  // Fallback: belum ada log nyata (atau Redis mati) — sajikan data demo.
  const result = listWebhookLogs(request.nextUrl.searchParams);
  return NextResponse.json({ data: result.data, meta: result.meta });
}

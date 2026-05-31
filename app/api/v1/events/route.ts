import { NextRequest, NextResponse } from "next/server";
import { verifyCsrfToken } from "@/lib/csrf";
import { createEventEnvelope, validateEventEnvelope, validateEventName } from "@/lib/socket/events";
import { publishToRedis } from "@/lib/socket/redis-publish";
import { dispatchWebhooks } from "@/lib/webhooks";
import { findAppByKey, verifyPublishSignature } from "@/lib/auth/app-credentials";
import { listEvents } from "@/app/api/v1/events/data";
import { getRedis } from "@/lib/redis-client";
import type { EventItem } from "@/lib/api";

export async function GET(request: NextRequest) {
  const redis = await getRedis();
  if (redis) {
    const raw = await redis.lrange("events:recent", 0, 199).catch(() => [] as string[]);
    if (raw.length > 0) {
      const sp = request.nextUrl.searchParams;
      const search = sp.get("search")?.toLowerCase() ?? "";
      const channel = sp.get("channel")?.toLowerCase() ?? "";
      const all = raw
        .map((s) => { try { return JSON.parse(s) as EventItem; } catch { return null; } })
        .filter((x): x is EventItem => x !== null)
        .filter((x) => !search || x.channel.toLowerCase().includes(search) || x.event.toLowerCase().includes(search))
        .filter((x) => !channel || x.channel.toLowerCase().includes(channel));
      const page = Number(sp.get("page") ?? 1);
      const perPage = Number(sp.get("per_page") ?? 50);
      const start = (page - 1) * perPage;
      return NextResponse.json({ data: all.slice(start, start + perPage), meta: { page, per_page: perPage, total: all.length } });
    }
  }
  // Fallback: belum ada event nyata (atau Redis mati) — sajikan data demo.
  const result = listEvents(request.nextUrl.searchParams);
  return NextResponse.json({ data: result.data, meta: result.meta });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body) as {
      channel?: string;
      channels?: string[];
      event?: string;
      name?: string;
      data?: unknown;
      socket_id?: string;
    };

    const channel = data.channel ?? data.channels?.[0];
    const event = data.event ?? data.name;
    const dataPayload = data.data;

    if (!channel || !event || dataPayload === undefined) {
      return NextResponse.json({ error: "Missing channel, event, or data" }, { status: 400 });
    }
    if (!validateEventName(event)) {
      return NextResponse.json({ error: "Invalid event name" }, { status: 400 });
    }

    // --- HMAC SIGNATURE AUTH ---
    const appKey = request.headers.get("x-app-key");
    const signature = request.headers.get("x-signature");

    if (appKey && signature) {
      const app = findAppByKey(appKey);
      if (!app) {
        return NextResponse.json({ error: "Invalid app key" }, { status: 401 });
      }
      if (!verifyPublishSignature(body, signature, app.secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    } else {
      // Fallback: session cookie (dashboard users)
      if (!request.cookies.get("gateway_session")?.value) {
        return NextResponse.json(
          { error: "Auth required: X-App-Key + X-Signature, or session cookie" },
          { status: 401 }
        );
      }
      // CSRF check for cookie-based auth
      const csrf = request.headers.get("x-csrf-token") || "";
      if (!verifyCsrfToken(csrf)) {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
      }
    }

    const envelope = createEventEnvelope({
      channel, event, data: dataPayload,
      meta: data.socket_id ? { socket_id: data.socket_id } : undefined,
    });
    const check = validateEventEnvelope(envelope);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 422 });
    }

    const published = await publishToRedis(channel, event, dataPayload);
    // Kirim event ke webhook terkonfigurasi (env GATEWAY_WEBHOOKS) — sekali di sisi publisher.
    await dispatchWebhooks(channel, event, dataPayload);
    return NextResponse.json(
      published ? {} : { warning: "accepted, redis unavailable" },
      { status: published ? 200 : 202 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

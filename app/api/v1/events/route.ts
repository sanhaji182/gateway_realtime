import { NextRequest, NextResponse } from "next/server";
import { createEventEnvelope, validateEventEnvelope, validateEventName } from "@/lib/socket/events";
import { publishToRedis } from "@/lib/socket/redis-publish";
import { findAppByKey, verifyPublishSignature } from "@/lib/auth/app-credentials";
import { listEvents } from "@/app/api/v1/events/data";

export async function GET(request: NextRequest) {
  return NextResponse.json(listEvents(request.nextUrl.searchParams));
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
    return NextResponse.json(
      published ? {} : { warning: "accepted, redis unavailable" },
      { status: published ? 200 : 202 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

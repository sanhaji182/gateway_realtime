import { NextRequest, NextResponse } from "next/server";
import { createEventEnvelope, validateEventEnvelope } from "@/lib/socket/events";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const batch = body.batch;
    if (!Array.isArray(batch) || batch.length === 0 || batch.length > 100) {
      return NextResponse.json({ error: "batch must be 1-100 items" }, { status: 400 });
    }
    const results = batch.map((item: Record<string, unknown>, index: number) => {
      if (!item.channel || !item.event || item.data === undefined) return { index, error: "Missing fields" };
      const envelope = createEventEnvelope({ channel: item.channel as string, event: item.event as string, data: item.data, meta: item.socket_id ? { socket_id: item.socket_id as string } : undefined });
      const check = validateEventEnvelope(envelope);
      return check.ok ? { index, status: "published" } : { index, error: check.error };
    });
    const fails = results.filter((r: { error?: string }) => r.error).length;
    return NextResponse.json({ published: batch.length - fails, failed: fails, results }, { status: fails > 0 ? 207 : 200 });
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
}

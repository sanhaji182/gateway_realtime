import { NextResponse } from "next/server";
import { findWebhookLog } from "@/app/api/v1/webhooks/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = findWebhookLog(id);
  if (!log) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Webhook log not found" } }, { status: 404 });
  return NextResponse.json({ data: log });
}

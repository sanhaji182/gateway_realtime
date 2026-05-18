import { NextRequest, NextResponse } from "next/server";
import { listWebhookLogs } from "@/app/api/v1/webhooks/data";

export async function GET(request: NextRequest) {
  const result = listWebhookLogs(request.nextUrl.searchParams);
  return NextResponse.json({ data: result.data, meta: result.meta });
}

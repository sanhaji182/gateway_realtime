import { NextRequest, NextResponse } from "next/server";
import { listWebhookLogs } from "@/app/api/v1/webhooks/data";

export async function GET(request: NextRequest) {
  return NextResponse.json(listWebhookLogs(request.nextUrl.searchParams));
}

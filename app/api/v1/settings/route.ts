import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

export function GET() {
  return NextResponse.json({
    gateway_name: "Gateway Realtime",
    default_channel: "events",
    event_retention_hours: 72,
    jwt_expiry_hours: 24,
    session_timeout_minutes: 60,
    rate_limit_events_per_minute: 1000,
    rate_limit_connections: 100,
    rate_limit_ws_per_minute: 100,
    csrf_token: generateCsrfToken(),
    jwt_secret_set: !!process.env.JWT_SECRET,
    app_secrets_count: (process.env.GATEWAY_APP_SECRETS || "").split(",").filter(Boolean).length,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  // In production, save to database or config file
  return NextResponse.json({ ...body, saved: true });
}

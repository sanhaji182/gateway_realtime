import { NextRequest, NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";
import { settings } from "@/app/api/v1/settings/data";

export function GET() {
  return NextResponse.json({
    data: {
      ...settings,
      csrf_token: generateCsrfToken(),
      jwt_secret_set: !!process.env.JWT_SECRET,
      app_secrets_count: (process.env.GATEWAY_APP_SECRETS || "").split(",").filter(Boolean).length,
    }
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ data: { ...body, saved: true } });
}

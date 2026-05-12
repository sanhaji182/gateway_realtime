import { NextResponse } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

export function GET() {
  return NextResponse.json({
    csrf_token: generateCsrfToken(),
    jwt_secret_set: !!process.env.JWT_SECRET,
    app_secrets_count: (process.env.GATEWAY_APP_SECRETS || "").split(",").filter(Boolean).length,
  });
}

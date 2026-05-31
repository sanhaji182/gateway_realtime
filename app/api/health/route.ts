// Health endpoint untuk dashboard Next.js (open source).
// Digunakan oleh docker compose healthcheck dan integration test.
// Tidak menyentuh external service — hanya menandakan proses Next.js hidup.
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ status: "ok", service: "gateway-dashboard" });
}

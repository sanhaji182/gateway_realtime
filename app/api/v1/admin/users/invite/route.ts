import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: { id: `u_${Date.now()}`, name: String(body.email ?? "").split("@")[0], email: body.email, role: body.role } });
}

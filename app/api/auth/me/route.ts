import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication is required" } }, { status: 401 });
  }

  return NextResponse.json({ data: user });
}

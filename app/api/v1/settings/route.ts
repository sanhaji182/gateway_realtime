import { NextResponse } from "next/server";
import { settings } from "@/app/api/v1/settings/data";

export async function GET() {
  return NextResponse.json({ data: settings });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: { ...settings, ...body } });
}

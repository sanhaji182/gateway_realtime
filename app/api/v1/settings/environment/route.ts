import { NextResponse } from "next/server";
import { environment } from "@/app/api/v1/settings/data";

export async function GET() {
  return NextResponse.json({ data: environment });
}

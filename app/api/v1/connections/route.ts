import { NextRequest, NextResponse } from "next/server";
import { listConnections } from "@/app/api/v1/connections/data";

export async function GET(request: NextRequest) {
  const result = listConnections(request.nextUrl.searchParams);
  return NextResponse.json({ data: result.data, meta: result.meta });
}

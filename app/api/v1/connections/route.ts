import { NextRequest, NextResponse } from "next/server";
import { listConnections } from "@/app/api/v1/connections/data";

export async function GET(request: NextRequest) {
  return NextResponse.json(listConnections(request.nextUrl.searchParams));
}

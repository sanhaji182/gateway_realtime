import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/app/api/v1/events/data";

export async function GET(request: NextRequest) {
  return NextResponse.json(listEvents(request.nextUrl.searchParams));
}

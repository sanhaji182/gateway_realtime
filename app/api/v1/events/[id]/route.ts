import { NextResponse } from "next/server";
import { findEvent } from "@/app/api/v1/events/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = findEvent(id);
  if (!event) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
  return NextResponse.json({ data: event });
}

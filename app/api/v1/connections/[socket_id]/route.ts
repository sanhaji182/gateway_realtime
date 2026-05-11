import { NextResponse } from "next/server";
import { findConnection } from "@/app/api/v1/connections/data";

export async function GET(_request: Request, { params }: { params: Promise<{ socket_id: string }> }) {
  const { socket_id } = await params;
  const connection = findConnection(socket_id);
  if (!connection) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Connection not found" } }, { status: 404 });
  return NextResponse.json({ data: connection });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ socket_id: string }> }) {
  const { socket_id } = await params;
  if (!findConnection(socket_id)) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Connection not found" } }, { status: 404 });
  return NextResponse.json({ data: { ok: true } });
}

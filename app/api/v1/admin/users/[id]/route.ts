import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ data: { id, ...body } });
}

export async function DELETE() {
  return NextResponse.json({ data: { ok: true } });
}

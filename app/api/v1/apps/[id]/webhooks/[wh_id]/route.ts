import { NextResponse } from "next/server";
import { okWebhook } from "@/app/api/v1/apps/data";
export async function PATCH(request: Request, { params }: { params: Promise<{ wh_id: string }> }) { const { wh_id } = await params; return NextResponse.json({ data: okWebhook({ ...(await request.json().catch(() => ({}))), id: wh_id }) }); }
export async function DELETE() { return NextResponse.json({ data: { ok: true } }); }

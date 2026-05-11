import { NextResponse } from "next/server";
import { events } from "@/app/api/v1/apps/data";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return NextResponse.json({ data: events[id] ?? [] }); }

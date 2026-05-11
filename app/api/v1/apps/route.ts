import { NextRequest, NextResponse } from "next/server";
import { listApps } from "@/app/api/v1/apps/data";
export async function GET(request: NextRequest) { return NextResponse.json(listApps(request.nextUrl.searchParams)); }
export async function POST(request: Request) { const body = await request.json().catch(() => ({})); return NextResponse.json({ data: { id: `app_${Date.now()}`, name: body.name, key: "pk_live_new", secret: "sk_live_new" } }, { status: 201 }); }

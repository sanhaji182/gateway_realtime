import { NextResponse } from "next/server";
import { okWebhook } from "@/app/api/v1/apps/data";
export async function POST(request: Request) { return NextResponse.json({ data: okWebhook(await request.json().catch(() => ({}))) }); }

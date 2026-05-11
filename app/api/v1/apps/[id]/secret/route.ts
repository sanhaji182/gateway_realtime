import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ data: { secret: "sk_live_a1b2c3_revealed" } }); }

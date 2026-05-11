import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ data: { secret: "sk_live_newvalue" } }); }

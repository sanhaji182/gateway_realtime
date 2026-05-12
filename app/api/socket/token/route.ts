import { NextResponse } from "next/server";

// GET /api/socket/token — Generate dev JWT for Go gateway WebSocket handshake
export async function GET() {
  const secret = process.env.JWT_SECRET || "change-me-in-production-64-chars-min";
  const encoder = new TextEncoder();
  
  const headerB64 = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const now = Math.floor(Date.now() / 1000);
  const claimsB64 = btoa(JSON.stringify({
    sub: "demo-user",
    user_id: "demo-user",
    role: "admin",
    iat: now,
    exp: now + 86400,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signingInput = `${headerB64}.${claimsB64}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return NextResponse.json({ token: `${headerB64}.${claimsB64}.${sigB64}` });
}

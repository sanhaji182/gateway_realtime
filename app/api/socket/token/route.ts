import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

// GET /api/socket/token — Menerbitkan JWT WebSocket singkat untuk user yang sedang login.
// Role diambil dari sesi yang terautentikasi (bukan hardcoded), sehingga token hanya
// memberi izin sesuai role user tersebut. Wajib ada sesi yang valid.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Login required" } }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET || "change-me-in-production-64-chars-min";
  const encoder = new TextEncoder();
  const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claimsB64 = b64url(JSON.stringify({
    sub: user.id,
    user_id: user.id,
    role: user.role,
    iat: now,
    exp: now + 86400,
  }));

  const signingInput = `${headerB64}.${claimsB64}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return NextResponse.json({ token: `${signingInput}.${sigB64}` });
}

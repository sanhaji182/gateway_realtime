import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import type { AuthUser } from "@/lib/api/types";

export const SESSION_COOKIE = "gateway_session";

const demoUsers: Array<Required<AuthUser> & { password: string }> = [
  { id: "usr_admin", email: "admin@gateway.local", password: "password", name: "Admin", role: "admin" },
  { id: "usr_viewer", email: "viewer@gateway.local", password: "password", name: "Viewer", role: "viewer" }
];

const SECRET = process.env.JWT_SECRET || "change-me-in-production-64-chars-min";

export function canEdit(user?: Pick<AuthUser, "role"> | null) {
  return user?.role !== "viewer";
}

export function authenticate(email: string, password: string) {
  return demoUsers.find((user) => user.email === email && user.password === password) ?? null;
}

// Signed session token: header.payload.signature (HMAC-SHA256)
export function createSessionToken(user: AuthUser) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  })).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const sig = createHmac("sha256", SECRET).update(signingInput).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function readSessionToken(token?: string) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const signingInput = `${parts[0]}.${parts[1]}`;
    const expectedSig = createHmac("sha256", SECRET).update(signingInput).digest();
    const providedSig = Buffer.from(parts[2], "base64url");
    if (!timingSafeEqual(expectedSig, providedSig)) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload.sub || !payload.email || !payload.name || !["admin", "editor", "viewer"].includes(payload.role)) return null;
    return { id: payload.sub, email: payload.email, name: payload.name, role: payload.role } as Required<AuthUser>;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/api/types";

export const SESSION_COOKIE = "gateway_session";

const demoUsers: Array<Required<AuthUser> & { password: string }> = [
  { id: "usr_admin", email: "admin@gateway.local", password: "password", name: "Admin", role: "admin" },
  { id: "usr_viewer", email: "viewer@gateway.local", password: "password", name: "Viewer", role: "viewer" }
];

export function canEdit(user?: Pick<AuthUser, "role"> | null) {
  return user?.role !== "viewer";
}

export function authenticate(email: string, password: string) {
  return demoUsers.find((user) => user.email === email && user.password === password) ?? null;
}

export function createSessionToken(user: AuthUser) {
  return Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role })).toString("base64url");
}

export function readSessionToken(token?: string) {
  if (!token) return null;

  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as Required<AuthUser>;
    if (!parsed.id || !parsed.email || !parsed.name || !["admin", "editor", "viewer"].includes(parsed.role)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

import { NextResponse } from "next/server";
import { authenticate, createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const user = authenticate(email, password);

  if (!user) {
    return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } }, { status: 401 });
  }

  const { password: _password, ...sessionUser } = user;
  const token = createSessionToken(sessionUser);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const response = NextResponse.json({ data: { token, expires_at: expiresAt, user: sessionUser } });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}

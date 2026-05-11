import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPresenceChannelData, createSocketAuthResponse, getChannelType, validateSocketAuthRequest, type SocketAppCredentials, type SocketAuthRequest } from "@/lib/socket";

const demoApps: Record<string, SocketAppCredentials> = {
  app_a1b2c: { appId: "app_a1b2c", appKey: "pk_live_a1b2c3", appSecret: "sk_live_a1b2c3" },
  app_ops: { appId: "app_ops", appKey: "pk_live_ops123", appSecret: "sk_live_ops123" },
  app_chat: { appId: "app_chat", appKey: "pk_live_chat99", appSecret: "sk_live_chat99" }
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => null)) as SocketAuthRequest | null;

  if (!body) {
    return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Invalid request body" } }, { status: 400 });
  }

  const credentials = demoApps[body.app_id];
  const validation = validateSocketAuthRequest({
    request: body,
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    appExists: !!credentials,
    socketExists: true
  });

  if (!validation.ok) {
    const status = validation.code === "AUTH_REQUIRED" ? 401 : validation.code === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: { code: validation.code, message: validation.message } }, { status });
  }

  const channelData = getChannelType(body.channel_name) === "presence" && user ? createPresenceChannelData({ id: user.id, name: user.name, role: user.role }) : null;
  return NextResponse.json({ data: createSocketAuthResponse({ credentials, socketId: body.socket_id, channelName: body.channel_name, channelData }) });
}

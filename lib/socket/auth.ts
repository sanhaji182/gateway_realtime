import { createHmac, timingSafeEqual } from "node:crypto";
import { canSubscribeToChannel, getChannelType, validateChannelName, type SubscribeRole } from "./channels";

export type SocketAuthRequest = {
  socket_id: string;
  channel_name: string;
  user_id?: string;
  app_id: string;
};

export type PresenceChannelData = {
  user_id: string;
  user_info: {
    name: string;
    role: string;
  };
};

export type SocketAuthResponse = {
  auth: string;
  channel_data: PresenceChannelData | null;
};

export type SocketAppCredentials = {
  appId: string;
  appKey: string;
  appSecret: string;
};

export type SocketAuthUser = {
  id: string;
  name: string;
  role: SubscribeRole | "editor" | string;
};

export type SocketAuthValidation =
  | { ok: true }
  | { ok: false; code: "AUTH_REQUIRED" | "FORBIDDEN" | "INVALID_SOCKET" | "INVALID_CHANNEL" | "INVALID_APP"; message: string };

const socketIdPattern = /^ws_[a-z0-9]+$/;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function createSocketSignature({ appSecret, socketId, channelName, channelData }: { appSecret: string; socketId: string; channelName: string; channelData?: PresenceChannelData | null }) {
  const payload = channelData ? `${socketId}:${channelName}:${canonicalJson(channelData)}` : `${socketId}:${channelName}`;
  return createHmac("sha256", appSecret).update(payload).digest("hex");
}

export function formatSocketAuth(appKey: string, signature: string) {
  return `${appKey}:${signature}`;
}

export function createSocketAuthResponse({ credentials, socketId, channelName, channelData = null }: { credentials: SocketAppCredentials; socketId: string; channelName: string; channelData?: PresenceChannelData | null }): SocketAuthResponse {
  const signature = createSocketSignature({ appSecret: credentials.appSecret, socketId, channelName, channelData });
  return { auth: formatSocketAuth(credentials.appKey, signature), channel_data: channelData };
}

export function verifySocketAuth({ auth, credentials, socketId, channelName, channelData = null }: { auth: string; credentials: SocketAppCredentials; socketId: string; channelName: string; channelData?: PresenceChannelData | null }) {
  const expected = createSocketAuthResponse({ credentials, socketId, channelName, channelData }).auth;
  const actualBuffer = Buffer.from(auth);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validateSocketAuthRequest({ request, user, socketExists, appExists }: { request: SocketAuthRequest; user: SocketAuthUser | null; socketExists: boolean; appExists: boolean }): SocketAuthValidation {
  if (!user) return { ok: false, code: "AUTH_REQUIRED", message: "Login required" };
  if (!appExists) return { ok: false, code: "INVALID_APP", message: "App not found" };
  if (!socketIdPattern.test(request.socket_id) || !socketExists) return { ok: false, code: "INVALID_SOCKET", message: "Socket not found" };

  const channel = validateChannelName(request.channel_name);
  if (!channel.ok) return { ok: false, code: "INVALID_CHANNEL", message: channel.error };

  const role = user.role === "admin" || user.role === "viewer" ? user.role : "user";
  const subscription = canSubscribeToChannel(request.channel_name, role);
  if (!subscription.ok) return { ok: false, code: "FORBIDDEN", message: "Not allowed to join this channel" };

  const channelType = getChannelType(request.channel_name);
  if (channelType === "wildcard" && role !== "admin") return { ok: false, code: "FORBIDDEN", message: "Not allowed to join this channel" };
  if ((channelType === "private" || channelType === "presence") && request.user_id && request.user_id !== user.id && role !== "admin") {
    return { ok: false, code: "FORBIDDEN", message: "Not allowed to join this channel" };
  }

  return { ok: true };
}

export function createPresenceChannelData(user: SocketAuthUser): PresenceChannelData {
  return { user_id: user.id, user_info: { name: user.name, role: user.role } };
}

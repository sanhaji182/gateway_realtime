import { validateChannelName } from "./channels";

export type SocketEventMeta = {
  source?: string;
  request_id?: string;
  trace_id?: string;
};

export type SocketEventEnvelope<TData = unknown> = {
  type: "event";
  channel: string;
  event: string;
  data: TData;
  ts: number;
  meta?: SocketEventMeta;
};

export type SocketSystemEventName =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "reconnected"
  | "heartbeat"
  | "subscription_succeeded"
  | "subscription_error"
  | "member_added"
  | "member_removed";

export type SocketSystemEnvelope<TData = unknown> = {
  type: "system";
  event: SocketSystemEventName;
  data?: TData;
  ts?: number;
};

export type SocketErrorEnvelope<TData = unknown> = {
  type: "error";
  code?: string;
  message?: string;
  data?: TData;
  ts?: number;
};

export type SocketEnvelope<TData = unknown> = SocketEventEnvelope<TData> | SocketSystemEnvelope<TData> | SocketErrorEnvelope<TData>;

export type BusinessEventName =
  | "chat.pesanbaru"
  | "chat.sedangmengetik"
  | "pesanan.baru"
  | "pesanan.statusberubah"
  | "pesanan.pembayaranditerima"
  | "dokumen.diupload"
  | "dokumen.disetujui"
  | "dokumen.ditolak"
  | "sistem.broadcast";

export const systemEventNames = new Set<SocketSystemEventName>([
  "connected",
  "disconnected",
  "reconnecting",
  "reconnected",
  "heartbeat",
  "subscription_succeeded",
  "subscription_error",
  "member_added",
  "member_removed"
]);

const eventNamePattern = /^[a-z0-9]+(?:\.[a-z0-9]+)+$/;
const sensitiveFieldPattern = /(^|_)(secret|token|password)($|_)/i;
const maxPayloadBytes = 10 * 1024;

export type EventValidationResult =
  | { ok: true; envelope: SocketEnvelope }
  | { ok: false; error: string };

export function createEventEnvelope<TData>({ channel, event, data, ts = Date.now(), meta }: { channel: string; event: string; data: TData; ts?: number; meta?: SocketEventMeta }): SocketEventEnvelope<TData> {
  const envelope: SocketEventEnvelope<TData> = { type: "event", channel, event, data, ts, ...(meta ? { meta } : {}) };
  const validation = validateEventEnvelope(envelope);
  if (!validation.ok) throw new Error(validation.error);
  return envelope;
}

export function validateEventName(event: string) {
  return eventNamePattern.test(event);
}

export function validateEventEnvelope(envelope: unknown): EventValidationResult {
  if (!isRecord(envelope) || envelope.type !== "event") return { ok: false, error: "Envelope type must be event" };
  if (typeof envelope.channel !== "string" || !validateChannelName(envelope.channel).ok) return { ok: false, error: "Invalid channel" };
  if (typeof envelope.event !== "string" || !validateEventName(envelope.event)) return { ok: false, error: "Event name must be lowercase dot notation" };
  if (!("data" in envelope)) return { ok: false, error: "Event data is required" };
  if (typeof envelope.ts !== "number" || !Number.isInteger(envelope.ts) || envelope.ts < 1_000_000_000_000) return { ok: false, error: "Timestamp must be unix milliseconds" };
  if (payloadSizeBytes(envelope.data) > maxPayloadBytes) return { ok: false, error: "Payload must be 10KB or smaller" };
  if (containsSensitiveField(envelope.data)) return { ok: false, error: "Payload must not contain secret, token, or password fields" };
  if ("meta" in envelope && envelope.meta !== undefined && !validateMeta(envelope.meta)) return { ok: false, error: "Invalid meta" };
  return { ok: true, envelope: envelope as SocketEventEnvelope };
}

export function validateSystemEnvelope(envelope: unknown): EventValidationResult {
  if (!isRecord(envelope) || envelope.type !== "system") return { ok: false, error: "Envelope type must be system" };
  if (typeof envelope.event !== "string" || !systemEventNames.has(envelope.event as SocketSystemEventName)) return { ok: false, error: "Unknown system event" };
  if ("ts" in envelope && envelope.ts !== undefined && (typeof envelope.ts !== "number" || !Number.isInteger(envelope.ts))) return { ok: false, error: "Timestamp must be unix milliseconds" };
  return { ok: true, envelope: envelope as SocketSystemEnvelope };
}

export function parseSocketEnvelope(raw: unknown): SocketEnvelope {
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!isRecord(value) || typeof value.type !== "string") throw new Error("Invalid envelope");
  if (value.type === "event") {
    const result = validateEventEnvelope(value);
    if (!result.ok) throw new Error(result.error);
    return result.envelope;
  }
  if (value.type === "system") {
    const result = validateSystemEnvelope(value);
    if (!result.ok) throw new Error(result.error);
    return result.envelope;
  }
  if (value.type === "error") return value as SocketErrorEnvelope;
  throw new Error("Unknown envelope type");
}

export function dedupeKey(envelope: SocketEventEnvelope) {
  return envelope.meta?.request_id ?? `${envelope.ts}:${envelope.event}:${envelope.channel}`;
}

export function payloadSizeBytes(data: unknown) {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

export function containsSensitiveField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveField);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, nested]) => sensitiveFieldPattern.test(key) || containsSensitiveField(nested));
}

function validateMeta(value: unknown) {
  if (!isRecord(value)) return false;
  return ["source", "request_id", "trace_id"].every((key) => !(key in value) || typeof value[key] === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

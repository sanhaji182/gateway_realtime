// Entry khusus BROWSER untuk bundle IIFE/CDN.
// Hanya mengekspor modul yang aman di browser: client realtime, helper channel/event,
// dan enkripsi (Web Crypto). Sengaja TIDAK menyertakan helper signing auth (lib/socket/auth.ts)
// yang memakai node:crypto/Buffer — itu untuk sisi server (backend yang menandatangani akses channel).
export { GatewayClient, GatewayChannel, reconnectDelay } from "./sdk";
export type { GatewayClientOptions, SubscribeOptions, PresenceMember, GatewayEnvelope } from "./sdk";
export * from "./channels";
export { parseSocketEnvelope, validateEventName, dedupeKey } from "./events";
export type { SocketEnvelope } from "./events";
export { isEncryptedChannel, toEncryptedChannel, generateSharedSecret, encryptPayload, decryptPayload } from "./encryption";

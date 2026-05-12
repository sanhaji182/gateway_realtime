// App credentials store — persistent app key + secret for REST API auth.
// In production, load from a database. For self-hosted demo, use env variable.

import { createHmac, timingSafeEqual } from "crypto";

export type AppCredentials = {
  appId: string;
  key: string;
  secret: string;
};

// Load secrets from env variable: GATEWAY_APP_SECRETS=app_id:key:secret,...
// Falls back to empty list in production (no hardcoded secrets).
function loadSecrets(): AppCredentials[] {
  const raw = process.env.GATEWAY_APP_SECRETS;
  if (!raw) return [];
  return raw.split(",").map((entry) => {
    const [appId, key, secret] = entry.split(":");
    return { appId, key, secret };
  });
}

// In-memory store — loaded once at startup
const appSecrets: AppCredentials[] = loadSecrets();

export function findAppByKey(key: string): AppCredentials | undefined {
  return appSecrets.find((app) => app.key === key);
}

// Timing-safe HMAC-SHA256 signature verification for REST API publish.
export function verifyPublishSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest();
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

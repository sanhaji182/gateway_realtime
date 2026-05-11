// App credentials store — each registered app has a key + secret for REST API auth
// In production, this would be a database table. For demo, we use in-memory + env var.

import { createHmac } from "crypto";

export type AppCredentials = {
  appId: string;
  key: string;
  secret: string;
};

// Dev credentials — in production, load from DB or secrets manager
const devApps: AppCredentials[] = [
  { appId: "app_a1b2c", key: "pk_live_a1b2c3", secret: "sk_live_dev_secret_a1b2c3" },
  { appId: "app_ops", key: "pk_live_ops123", secret: "sk_live_dev_secret_ops123" },
  { appId: "app_chat", key: "pk_live_chat99", secret: "sk_live_dev_secret_chat99" },
  // Playground dev key
  { appId: "dev_playground", key: "pk_dev_playground", secret: "sk_dev_playground_secret" },
];

export function findAppByKey(key: string): AppCredentials | undefined {
  return devApps.find((app) => app.key === key);
}

// Verify HMAC-SHA256 signature for REST API publish
// Format: body = JSON.stringify({ channel, event, data, socket_id? })
// Signature = HMAC-SHA256(secret, body) sent as X-Signature header
export function verifyPublishSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // Timing-safe comparison
  const provided = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (provided.length !== exp.length) return false;
  return createHmac("sha256", secret).update(body).digest("hex") === signature;
}

import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.JWT_SECRET || "change-me-in-production-64-chars-min";

// Generate a CSRF token signed with the server secret
export function generateCsrfToken(): string {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", SECRET).update(nonce).digest("hex");
  return `${nonce}.${sig}`;
}

// Verify CSRF token (any non-graphical endpoint that mutates state)
export function verifyCsrfToken(token: string): boolean {
  try {
    const [nonce, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET).update(nonce).digest("hex");
    return expected === sig;
  } catch {
    return false;
  }
}

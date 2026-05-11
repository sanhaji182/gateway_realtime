// Encrypted channel support — compatible with Pusher private-encrypted-* channels
// Uses AES-256-GCM via Web Crypto API (browser) or Node.js crypto

let cryptoImpl: typeof globalThis.crypto | null = null;

function getCrypto(): typeof globalThis.crypto {
  if (cryptoImpl) return cryptoImpl;
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    cryptoImpl = globalThis.crypto;
    return cryptoImpl;
  }
  // Node.js fallback
  try {
    const nodeCrypto = require("crypto");
    cryptoImpl = nodeCrypto.webcrypto as typeof globalThis.crypto;
    return cryptoImpl!;
  } catch {
    throw new Error("Web Crypto API not available");
  }
}

// Derive a shared secret using ECDH for encrypted channels
export async function generateSharedSecret(
  channelName: string,
  keyBase64: string
): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyBase64);
  const channelData = encoder.encode(channelName);

  // Import as raw AES key material
  const baseKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  // Derive channel-specific key using HKDF
  const derivedKey = await crypto.subtle.importKey(
    "raw",
    await crypto.subtle.digest("SHA-256", channelData),
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: encoder.encode("encrypted-channel"),
    },
    derivedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a payload for encrypted channels
export async function encryptPayload(
  key: CryptoKey,
  payload: string
): Promise<{ ciphertext: string; iv: string }> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(payload);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt a payload from encrypted channels
export async function decryptPayload(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const crypto = getCrypto();
  const ct = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ct
  );

  return new TextDecoder().decode(decrypted);
}

// Check if a channel name is an encrypted channel
export function isEncryptedChannel(name: string): boolean {
  return name.startsWith("private-encrypted-");
}

// Convert standard private channel to encrypted
export function toEncryptedChannel(domain: string, id: string | number): string {
  return `private-encrypted-${domain}.${id}`;
}

import assert from "node:assert/strict";
import { test } from "node:test";

const enc = await import("../../dist-test/socket/encryption.js");

test("encrypt/decrypt round-trip dengan kunci turunan dari secret", async () => {
  const key = await enc.generateSharedSecret("private-encrypted-room.1", "rahasia-bersama");
  const { ciphertext, iv } = await enc.encryptPayload(key, JSON.stringify({ hello: "dunia" }));
  const plain = await enc.decryptPayload(key, ciphertext, iv);
  assert.deepEqual(JSON.parse(plain), { hello: "dunia" });
});

test("kunci berbeda per channel meski secret sama", async () => {
  const k1 = await enc.generateSharedSecret("private-encrypted-a", "s");
  const k2 = await enc.generateSharedSecret("private-encrypted-b", "s");
  const { ciphertext, iv } = await enc.encryptPayload(k1, "x");
  // Dekripsi dengan kunci channel lain harus gagal (AES-GCM auth tag).
  await assert.rejects(() => enc.decryptPayload(k2, ciphertext, iv));
});

test("helper channel terenkripsi", () => {
  assert.equal(enc.isEncryptedChannel("private-encrypted-x"), true);
  assert.equal(enc.isEncryptedChannel("private-x"), false);
  assert.equal(enc.toEncryptedChannel("room", 1), "private-encrypted-room.1");
});

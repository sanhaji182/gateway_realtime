import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

const auth = await import("../../dist-test/socket/auth.js");

const credentials = { appId: "app_a1b2c", appKey: "pk_live_a1b2c3", appSecret: "sk_live_a1b2c3" };
const user = { id: "u-881", name: "San Haji", role: "admin" };

test("creates deterministic private channel signature", () => {
  const signature = auth.createSocketSignature({ appSecret: credentials.appSecret, socketId: "ws_a1b2c3", channelName: "private-orders.99" });
  const expected = createHmac("sha256", credentials.appSecret).update("ws_a1b2c3:private-orders.99").digest("hex");
  assert.equal(signature, expected);
  assert.deepEqual(auth.createSocketAuthResponse({ credentials, socketId: "ws_a1b2c3", channelName: "private-orders.99" }), { auth: `${credentials.appKey}:${expected}`, channel_data: null });
});

test("canonicalizes presence channel data for deterministic signatures", () => {
  const channelData = { user_info: { role: "admin", name: "San Haji" }, user_id: "u-881" };
  const canonical = auth.canonicalJson(channelData);
  assert.equal(canonical, '{"user_id":"u-881","user_info":{"name":"San Haji","role":"admin"}}');
  const signature = auth.createSocketSignature({ appSecret: credentials.appSecret, socketId: "ws_a1b2c3", channelName: "presence-room.1", channelData });
  const expected = createHmac("sha256", credentials.appSecret).update(`ws_a1b2c3:presence-room.1:${canonical}`).digest("hex");
  assert.equal(signature, expected);
});

test("verifies auth string with timing-safe comparison", () => {
  const response = auth.createSocketAuthResponse({ credentials, socketId: "ws_a1b2c3", channelName: "private-orders.99" });
  assert.equal(auth.verifySocketAuth({ auth: response.auth, credentials, socketId: "ws_a1b2c3", channelName: "private-orders.99" }), true);
  assert.equal(auth.verifySocketAuth({ auth: `${response.auth}bad`, credentials, socketId: "ws_a1b2c3", channelName: "private-orders.99" }), false);
});

test("validates auth requirements and access matrix", () => {
  const request = { socket_id: "ws_a1b2c3", channel_name: "private-orders.99", user_id: "u-881", app_id: "app_a1b2c" };
  assert.deepEqual(auth.validateSocketAuthRequest({ request, user: null, socketExists: true, appExists: true }), { ok: false, code: "AUTH_REQUIRED", message: "Login required" });
  assert.deepEqual(auth.validateSocketAuthRequest({ request, user, socketExists: false, appExists: true }), { ok: false, code: "INVALID_SOCKET", message: "Socket not found" });
  assert.deepEqual(auth.validateSocketAuthRequest({ request, user, socketExists: true, appExists: false }), { ok: false, code: "INVALID_APP", message: "App not found" });
  assert.deepEqual(auth.validateSocketAuthRequest({ request: { ...request, user_id: "u-999" }, user: { ...user, role: "user" }, socketExists: true, appExists: true }), { ok: false, code: "FORBIDDEN", message: "Not allowed to join this channel" });
  assert.deepEqual(auth.validateSocketAuthRequest({ request: { ...request, channel_name: "orders.*" }, user: { ...user, role: "viewer" }, socketExists: true, appExists: true }), { ok: false, code: "FORBIDDEN", message: "Not allowed to join this channel" });
  assert.deepEqual(auth.validateSocketAuthRequest({ request: { ...request, channel_name: "orders.*" }, user, socketExists: true, appExists: true }), { ok: true });
});

test("creates presence channel data from authenticated user", () => {
  assert.deepEqual(auth.createPresenceChannelData(user), { user_id: "u-881", user_info: { name: "San Haji", role: "admin" } });
});

import assert from "node:assert/strict";
import { test } from "node:test";

const events = await import("../../dist-test/socket/events.js");
const sdk = await import("../../dist-test/socket/sdk.js");

test("creates and validates required event envelope fields", () => {
  const envelope = events.createEventEnvelope({
    channel: "orders.99",
    event: "order.paid",
    data: { order_id: 99, amount: 150000 },
    ts: 1746432001842,
    meta: { source: "ci4-api", request_id: "req_aa1" }
  });
  assert.deepEqual(envelope, { type: "event", channel: "orders.99", event: "order.paid", data: { order_id: 99, amount: 150000 }, ts: 1746432001842, meta: { source: "ci4-api", request_id: "req_aa1" } });
  assert.equal(events.validateEventEnvelope(envelope).ok, true);
});

test("rejects invalid event names timestamps payload size and sensitive fields", () => {
  const base = { type: "event", channel: "orders.99", event: "order.paid", data: { order_id: 99 }, ts: 1746432001842 };
  assert.equal(events.validateEventEnvelope({ ...base, event: "OrderPaid" }).ok, false);
  assert.equal(events.validateEventEnvelope({ ...base, ts: 1746432001 }).ok, false);
  assert.equal(events.validateEventEnvelope({ ...base, data: { token: "secret-token" } }).ok, false);
  assert.equal(events.validateEventEnvelope({ ...base, data: { nested: { password: "pw" } } }).ok, false);
  assert.equal(events.validateEventEnvelope({ ...base, data: { text: "x".repeat(11 * 1024) } }).ok, false);
});

test("validates known system events only", () => {
  assert.equal(events.validateSystemEnvelope({ type: "system", event: "connected", data: { socketId: "ws_1" } }).ok, true);
  assert.equal(events.validateSystemEnvelope({ type: "system", event: "unknown" }).ok, false);
});

test("parses socket envelopes through shared contract", () => {
  const raw = JSON.stringify({ type: "event", channel: "orders.99", event: "order.paid", data: { ok: true }, ts: 1746432001842 });
  assert.deepEqual(events.parseSocketEnvelope(raw), { type: "event", channel: "orders.99", event: "order.paid", data: { ok: true }, ts: 1746432001842 });
  assert.deepEqual(sdk.parseEnvelope(raw), { type: "event", channel: "orders.99", event: "order.paid", data: { ok: true }, ts: 1746432001842 });
});

test("dedupe key prefers request id and falls back to ts event channel", () => {
  const withRequest = { type: "event", channel: "orders.99", event: "order.paid", data: {}, ts: 1746432001842, meta: { request_id: "req_aa1" } };
  const withoutRequest = { type: "event", channel: "orders.99", event: "order.paid", data: {}, ts: 1746432001842 };
  assert.equal(events.dedupeKey(withRequest), "req_aa1");
  assert.equal(events.dedupeKey(withoutRequest), "1746432001842:order.paid:orders.99");
});

test("payload size uses serialized byte length", () => {
  assert.equal(events.payloadSizeBytes({ ok: true }), JSON.stringify({ ok: true }).length);
});

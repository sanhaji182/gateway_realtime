import assert from "node:assert/strict";
import { test } from "node:test";

const sdk = await import("../../dist-test/socket/sdk.js");

class MockWebSocket {
  static instances = [];
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = 0;
  sent = [];
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;

  constructor(url) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = this.OPEN;
    this.onopen?.({});
  }

  send(payload) {
    this.sent.push(JSON.parse(payload));
  }

  close(reason = "closed") {
    this.readyState = this.CLOSED;
    this.onclose?.({ reason });
  }

  message(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }
}

test("computes reconnect backoff with 30s max", () => {
  assert.equal(sdk.reconnectDelay(1), 1000);
  assert.equal(sdk.reconnectDelay(2), 2000);
  assert.equal(sdk.reconnectDelay(5), 16000);
  assert.equal(sdk.reconnectDelay(6), 30000);
  assert.equal(sdk.reconnectDelay(99), 30000);
});

test("connects and exposes socket id from system envelope", () => {
  MockWebSocket.instances = [];
  const client = new sdk.GatewayClient({ key: "pk_live_...", host: "wss://gateway.internal", WebSocketImpl: MockWebSocket });
  let connected;
  client.on("connected", (payload) => { connected = payload; });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws.open();
  ws.message({ type: "system", event: "connected", data: { socketId: "ws_1" } });
  assert.equal(client.socketId, "ws_1");
  assert.deepEqual(connected, { socketId: "ws_1" });
});

test("subscribes public channel and dispatches channel handlers", () => {
  MockWebSocket.instances = [];
  const client = new sdk.GatewayClient({ key: "pk_live_...", host: "wss://gateway.internal", WebSocketImpl: MockWebSocket });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws.open();
  const channel = client.subscribe("orders.99");
  assert.deepEqual(ws.sent.at(-1), { type: "subscribe", channel: "orders.99", channel_data: null });
  let paid;
  let wildcard;
  channel.on("order.paid", (data) => { paid = data; });
  channel.on("*", (eventName, data) => { wildcard = { eventName, data }; });
  ws.message({ type: "event", channel: "orders.99", event: "order.paid", data: { order_id: 99 }, ts: 1746432001842746432001842 });
  assert.deepEqual(paid, { order_id: 99 });
  assert.deepEqual(wildcard, { eventName: "order.paid", data: { order_id: 99 } });
});

test("uses auth payload for private channel subscriptions", async () => {
  MockWebSocket.instances = [];
  const client = new sdk.GatewayClient({ key: "pk_live_...", host: "wss://gateway.internal", WebSocketImpl: MockWebSocket });
  client.connect();
  const ws = MockWebSocket.instances[0];
  ws.open();
  client.subscribe("private-orders.99", { auth: async () => ({ auth: "pk_live_...:sig", channel_data: null }) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(ws.sent.at(-1), { type: "subscribe", channel: "private-orders.99", auth: "pk_live_...:sig", channel_data: null });
});

test("tracks presence members from presence events", () => {
  MockWebSocket.instances = [];
  const client = new sdk.GatewayClient({ key: "pk_live_...", host: "wss://gateway.internal", WebSocketImpl: MockWebSocket });
  const channel = client.subscribe("presence-room.1", { auth: () => ({ auth: "pk:sig", channel_data: { user_id: "u-1" } }) });
  channel.handleEvent("member_added", { user_id: "u-1", user_info: { name: "One" } });
  assert.equal(channel.count(), 1);
  channel.handleEvent("member_removed", { user_id: "u-1" });
  assert.equal(channel.count(), 0);
});

test("parses event envelopes and rejects invalid envelopes", () => {
  assert.deepEqual(sdk.parseEnvelope(JSON.stringify({ type: "event", channel: "orders.99", event: "order.paid", data: { ok: true }, ts: 1746432001842 })), { type: "event", channel: "orders.99", event: "order.paid", data: { ok: true }, ts: 1746432001842 });
  assert.throws(() => sdk.parseEnvelope(JSON.stringify({ type: "event", event: "missing-channel", ts: 1746432001842 })));
});

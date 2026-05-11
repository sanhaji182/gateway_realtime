import assert from "node:assert/strict";
import { test } from "node:test";

const channels = await import("../../dist-test/socket/channels.js");
const registry = await import("../../dist-test/socket/registry.js");

test("classifies public private presence and wildcard channels", () => {
  assert.equal(channels.getChannelType("orders.99"), "public");
  assert.equal(channels.getChannelType("private-orders.99"), "private");
  assert.equal(channels.getChannelType("presence-room.1"), "presence");
  assert.equal(channels.getChannelType("orders.*"), "wildcard");
});

test("validates naming rules", () => {
  assert.equal(channels.validateChannelName("orders.99").ok, true);
  assert.equal(channels.validateChannelName("Orders.99").ok, false);
  assert.equal(channels.validateChannelName("orders 99").ok, false);
  assert.equal(channels.validateChannelName("order-items.99").ok, false);
  assert.equal(channels.validateChannelName("orders.*.paid").ok, false);
  assert.equal(channels.validateChannelName("x".repeat(101)).ok, false);
});

test("restricts wildcard subscriptions to admin or viewer roles", () => {
  assert.equal(channels.canSubscribeToChannel("orders.*", "user").ok, false);
  assert.equal(channels.canSubscribeToChannel("orders.*", "admin").ok, true);
  assert.equal(channels.canSubscribeToChannel("orders.*", "viewer").ok, true);
});

test("matches wildcard subscriptions deterministically", () => {
  assert.equal(channels.channelMatches("orders.*", "orders.99"), true);
  assert.equal(channels.channelMatches("orders.*", "chat.99"), false);
  assert.equal(channels.channelMatches("orders.99", "orders.99"), true);
});

test("stores channel membership in memory per socket", () => {
  const state = new registry.SocketChannelRegistry();
  state.join("ws_1", "orders.99");
  state.join("ws_1", "private-orders.99");
  state.join("ws_2", "orders.99");
  assert.deepEqual(state.getChannels("ws_1"), ["orders.99", "private-orders.99"]);
  assert.deepEqual(state.getSockets("orders.99"), ["ws_1", "ws_2"]);
  state.leave("ws_1", "orders.99");
  assert.equal(state.has("ws_1", "orders.99"), false);
  assert.deepEqual(state.disconnect("ws_2"), ["orders.99"]);
});

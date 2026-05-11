import assert from "node:assert/strict";
import { test } from "node:test";

const presence = await import("../../dist-test/socket/presence.js");
const sdk = await import("../../dist-test/socket/sdk.js");

const memberA = { user_id: "u-881", user_info: { name: "San Haji", avatar: "https://avatar.local/u-881.png", role: "admin" } };
const memberB = { user_id: "u-882", user_info: { name: "Nadia", role: "viewer" } };

test("presence registry joins members with per-socket count", () => {
  const registry = new presence.PresenceRegistry();
  const joined = registry.join("presence-room.1", "ws_1", memberA);
  assert.equal(joined.event.event, "member_added");
  assert.deepEqual(joined.event.data, memberA);
  registry.join("presence-room.1", "ws_2", memberA);
  assert.equal(registry.count("presence-room.1"), 2);
  assert.deepEqual(registry.members("presence-room.1"), [memberA, memberA]);
});

test("presence registry emits subscription succeeded snapshot", () => {
  const registry = new presence.PresenceRegistry();
  registry.join("presence-room.1", "ws_1", memberA);
  registry.join("presence-room.1", "ws_2", memberB);
  assert.deepEqual(registry.subscriptionSucceeded("presence-room.1"), { event: "subscription_succeeded", channel: "presence-room.1", data: { members: [memberA, memberB], count: 2 } });
});

test("presence registry removes members on leave and disconnect", () => {
  const registry = new presence.PresenceRegistry();
  registry.join("presence-room.1", "ws_1", memberA);
  registry.join("presence-chat.55", "ws_1", memberA);
  assert.deepEqual(registry.leave("presence-room.1", "ws_1"), { event: "member_removed", channel: "presence-room.1", data: memberA });
  assert.equal(registry.count("presence-room.1"), 0);
  assert.deepEqual(registry.disconnect("ws_1"), [{ event: "member_removed", channel: "presence-chat.55", data: memberA }]);
});

test("presence registry cleanup removes after two missed heartbeats", () => {
  const registry = new presence.PresenceRegistry();
  registry.join("presence-room.1", "ws_1", memberA);
  assert.deepEqual(registry.markHeartbeatMiss("ws_1"), []);
  assert.deepEqual(registry.markHeartbeatMiss("ws_1"), [{ event: "member_removed", channel: "presence-room.1", data: memberA }]);
  assert.equal(registry.count("presence-room.1"), 0);
});

test("presence registry rejects non-presence channels", () => {
  const registry = new presence.PresenceRegistry();
  assert.throws(() => registry.join("orders.99", "ws_1", memberA), /Presence channel/);
});

test("SDK updates presence members from subscription and member events", () => {
  const client = new sdk.GatewayClient({ key: "pk", host: "wss://gateway.internal", WebSocketImpl: class {} });
  const channel = client.subscribe("presence-room.1", { auth: () => ({ auth: "pk:sig", channel_data: memberA }) });
  let succeeded;
  let added;
  let removed;
  channel.on("subscription_succeeded", (payload) => { succeeded = payload; });
  channel.on("member_added", (member) => { added = member; });
  channel.on("member_removed", (member) => { removed = member; });
  channel.handleEvent("subscription_succeeded", { members: [memberA], count: 1 });
  channel.handleEvent("member_added", memberB);
  channel.handleEvent("member_removed", memberA);
  assert.deepEqual(succeeded, { members: [memberA], count: 1 });
  assert.deepEqual(added, memberB);
  assert.deepEqual(removed, memberA);
  assert.deepEqual(channel.members(), [memberB]);
  assert.equal(channel.count(), 1);
});

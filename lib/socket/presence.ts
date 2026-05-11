import { assertValidChannelName, isPresenceChannel } from "./channels";

export type PresenceMember = {
  user_id: string;
  user_info: {
    name?: string;
    avatar?: string;
    role?: string;
    [key: string]: unknown;
  };
};

export type PresenceEntry = {
  socketId: string;
  member: PresenceMember;
  missedHeartbeats: number;
  joinedAt: number;
};

export type PresenceSnapshot = {
  members: PresenceMember[];
  count: number;
};

export type PresenceEvent =
  | { event: "subscription_succeeded"; channel: string; data: PresenceSnapshot }
  | { event: "subscription_error"; channel: string; data: { message: string } }
  | { event: "member_added"; channel: string; data: PresenceMember }
  | { event: "member_removed"; channel: string; data: PresenceMember };

export class PresenceRegistry {
  private rooms = new Map<string, Map<string, PresenceEntry>>();

  join(channel: string, socketId: string, member: PresenceMember): { snapshot: PresenceSnapshot; event: PresenceEvent } {
    this.assertPresence(channel);
    const room = this.rooms.get(channel) ?? new Map<string, PresenceEntry>();
    room.set(socketId, { socketId, member, missedHeartbeats: 0, joinedAt: Date.now() });
    this.rooms.set(channel, room);
    return { snapshot: this.snapshot(channel), event: { event: "member_added", channel, data: member } };
  }

  leave(channel: string, socketId: string): PresenceEvent | null {
    this.assertPresence(channel);
    const room = this.rooms.get(channel);
    const entry = room?.get(socketId);
    if (!room || !entry) return null;
    room.delete(socketId);
    if (room.size === 0) this.rooms.delete(channel);
    return { event: "member_removed", channel, data: entry.member };
  }

  disconnect(socketId: string): PresenceEvent[] {
    const events: PresenceEvent[] = [];
    for (const channel of Array.from(this.rooms.keys())) {
      const event = this.leave(channel, socketId);
      if (event) events.push(event);
    }
    return events;
  }

  heartbeat(socketId: string) {
    for (const room of this.rooms.values()) {
      const entry = room.get(socketId);
      if (entry) entry.missedHeartbeats = 0;
    }
  }

  markHeartbeatMiss(socketId: string) {
    const removed: PresenceEvent[] = [];
    for (const [channel, room] of Array.from(this.rooms.entries())) {
      const entry = room.get(socketId);
      if (!entry) continue;
      entry.missedHeartbeats += 1;
      if (entry.missedHeartbeats >= 2) {
        room.delete(socketId);
        removed.push({ event: "member_removed", channel, data: entry.member });
      }
      if (room.size === 0) this.rooms.delete(channel);
    }
    return removed;
  }

  snapshot(channel: string): PresenceSnapshot {
    this.assertPresence(channel);
    const entries = Array.from(this.rooms.get(channel)?.values() ?? []);
    return { members: entries.map((entry) => entry.member), count: entries.length };
  }

  count(channel: string) {
    return this.snapshot(channel).count;
  }

  members(channel: string) {
    return this.snapshot(channel).members;
  }

  subscriptionSucceeded(channel: string): PresenceEvent {
    return { event: "subscription_succeeded", channel, data: this.snapshot(channel) };
  }

  subscriptionError(channel: string, message: string): PresenceEvent {
    this.assertPresence(channel);
    return { event: "subscription_error", channel, data: { message } };
  }

  private assertPresence(channel: string) {
    const valid = assertValidChannelName(channel);
    if (!isPresenceChannel(valid.name)) throw new Error("Presence channel must start with presence-");
  }
}

export const presenceRegistry = new PresenceRegistry();

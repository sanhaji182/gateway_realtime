import { assertValidChannelName } from "./channels";

export type SocketChannelState = {
  socketId: string;
  channels: Set<string>;
};

export class SocketChannelRegistry {
  private sockets = new Map<string, Set<string>>();

  join(socketId: string, channel: string) {
    const validChannel = assertValidChannelName(channel);
    const channels = this.sockets.get(socketId) ?? new Set<string>();
    channels.add(validChannel.name);
    this.sockets.set(socketId, channels);
    return this.getChannels(socketId);
  }

  leave(socketId: string, channel: string) {
    const validChannel = assertValidChannelName(channel);
    const channels = this.sockets.get(socketId);
    if (!channels) return [];
    channels.delete(validChannel.name);
    if (channels.size === 0) this.sockets.delete(socketId);
    return this.getChannels(socketId);
  }

  disconnect(socketId: string) {
    const channels = this.getChannels(socketId);
    this.sockets.delete(socketId);
    return channels;
  }

  getChannels(socketId: string) {
    return Array.from(this.sockets.get(socketId) ?? []).sort();
  }

  has(socketId: string, channel: string) {
    const validChannel = assertValidChannelName(channel);
    return this.sockets.get(socketId)?.has(validChannel.name) ?? false;
  }

  getSockets(channel: string) {
    const validChannel = assertValidChannelName(channel);
    return Array.from(this.sockets.entries())
      .filter(([, channels]) => channels.has(validChannel.name))
      .map(([socketId]) => socketId)
      .sort();
  }

  snapshot(): SocketChannelState[] {
    return Array.from(this.sockets.entries()).map(([socketId, channels]) => ({ socketId, channels: new Set(channels) }));
  }
}

export const socketChannelRegistry = new SocketChannelRegistry();

import { getChannelType, isEncryptedChannel, validateChannelName } from "./channels";
import { parseSocketEnvelope, type SocketEnvelope } from "./events";

export type GatewayClientState = "idle" | "connecting" | "connected" | "disconnected" | "reconnecting";
export type GatewayClientEvent = "connected" | "disconnected" | "reconnecting" | "reconnected" | "error" | "state_change";
export type GatewayEventHandler<T = unknown> = (payload: T) => void;
export type ChannelEventHandler = (...args: unknown[]) => void;

export type GatewayClientOptions = {
  key: string;
  host: string;
  authEndpoint?: string;
  autoReconnect?: boolean;
  pingInterval?: number;
  WebSocketImpl?: typeof WebSocket;
  fetcher?: typeof fetch;
};

export type SubscribeOptions = {
  auth?: () => Promise<Response | SocketAuthPayload> | Response | SocketAuthPayload;
};

export type SocketAuthPayload = {
  auth: string;
  channel_data?: unknown;
};

export type GatewayEnvelope = SocketEnvelope;

export type PresenceMember = {
  user_id: string;
  user_info?: Record<string, unknown>;
};

type SubscriptionState = "pending" | "subscribed" | "error";

const defaultBackoffMs = [1000, 2000, 4000, 8000, 16000, 30000];

export function reconnectDelay(attempt: number) {
  return defaultBackoffMs[Math.min(Math.max(attempt - 1, 0), defaultBackoffMs.length - 1)];
}

export class GatewayChannel {
  readonly name: string;
  readonly client: GatewayClient;
  private handlers = new Map<string, Set<ChannelEventHandler>>();
  private memberMap = new Map<string, PresenceMember>();
  state: SubscriptionState = "pending";
  options?: SubscribeOptions;

  constructor(client: GatewayClient, name: string, options?: SubscribeOptions) {
    this.client = client;
    this.name = name;
    this.options = options;
  }

  on(eventName: string, handler: ChannelEventHandler) {
    const handlers = this.handlers.get(eventName) ?? new Set<ChannelEventHandler>();
    handlers.add(handler);
    this.handlers.set(eventName, handlers);
    return this;
  }

  bind(eventName: string, handler: ChannelEventHandler) {
    return this.on(eventName, handler);
  }

  off(eventName: string, handler?: ChannelEventHandler) {
    if (!handler) this.handlers.delete(eventName);
    else this.handlers.get(eventName)?.delete(handler);
    return this;
  }

  unbind(eventName: string, handler?: ChannelEventHandler) {
    return this.off(eventName, handler);
  }

  unsubscribe() {
    this.client.unsubscribe(this.name);
  }

  members() {
    return Array.from(this.memberMap.values());
  }

  count() {
    return this.memberMap.size;
  }

  handleEvent(eventName: string, data: unknown) {
    if (eventName === "member_added" && isPresenceMember(data)) this.memberMap.set(data.user_id, data);
    if (eventName === "member_removed" && isPresenceMember(data)) this.memberMap.delete(data.user_id);
    if (eventName === "subscription_succeeded" && isPresenceSnapshot(data)) {
      this.memberMap.clear();
      data.members.filter(isPresenceMember).forEach((member) => this.memberMap.set(member.user_id, member));
    }

    this.handlers.get(eventName)?.forEach((handler) => safeCall(handler, data));
    this.handlers.get("*")?.forEach((handler) => safeCall(handler, eventName, data));
  }
}

export class GatewayClient {
  private options: Required<Pick<GatewayClientOptions, "authEndpoint" | "autoReconnect" | "pingInterval">> & GatewayClientOptions;
  private ws: WebSocket | null = null;
  private channels = new Map<string, GatewayChannel>();
  private globalHandlers = new Map<string, Set<ChannelEventHandler>>();
  private lifecycleHandlers = new Map<GatewayClientEvent, Set<GatewayEventHandler>>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualDisconnect = false;
  private currentState: GatewayClientState = "idle";
  private currentSocketId: string | null = null;

  constructor(options: GatewayClientOptions) {
    this.options = { authEndpoint: "/api/socket/auth", autoReconnect: true, pingInterval: 30000, ...options };
  }

  get socketId() {
    return this.currentSocketId;
  }

  setToken(token: string) {
    (this.options as Record<string, unknown>)._token = token;
  }

  connect() {
    if (this.ws && (this.ws.readyState === this.ws.OPEN || this.ws.readyState === this.ws.CONNECTING)) return;
    this.manualDisconnect = false;
    this.setState(this.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    try {
      const WebSocketImpl = this.options.WebSocketImpl ?? WebSocket;
      this.ws = new WebSocketImpl(this.buildUrl());
      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event.data);
      this.ws.onerror = () => this.emitLifecycle("error", { code: "WEBSOCKET_ERROR", message: "WebSocket error" });
      this.ws.onclose = (event) => this.handleClose(event.reason || "closed");
    } catch {
      this.emitLifecycle("error", { code: "SERVER_UNAVAILABLE", message: "Unable to connect" });
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
    this.setState("disconnected");
    this.emitLifecycle("disconnected", { reason: "manual" });
  }

  subscribe(channelName: string, options?: SubscribeOptions) {
    const valid = validateChannelName(channelName);
    if (!valid.ok) {
      this.emitLifecycle("error", { code: "INVALID_CHANNEL", message: valid.error });
      return new GatewayChannel(this, channelName, options);
    }

    const existing = this.channels.get(channelName);
    if (existing) return existing;

    const channel = new GatewayChannel(this, channelName, options);
    this.channels.set(channelName, channel);
    void this.sendSubscribe(channel);
    return channel;
  }

  unsubscribe(channelName: string) {
    this.channels.delete(channelName);
    this.send({ type: "unsubscribe", channel: channelName });
  }

  bind(eventName: string, handler: ChannelEventHandler) {
    const handlers = this.globalHandlers.get(eventName) ?? new Set<ChannelEventHandler>();
    handlers.add(handler);
    this.globalHandlers.set(eventName, handlers);
    return this;
  }

  unbind(eventName: string, handler?: ChannelEventHandler) {
    if (!handler) this.globalHandlers.delete(eventName);
    else this.globalHandlers.get(eventName)?.delete(handler);
    return this;
  }

  on(eventName: GatewayClientEvent, handler: GatewayEventHandler) {
    const handlers = this.lifecycleHandlers.get(eventName) ?? new Set<GatewayEventHandler>();
    handlers.add(handler);
    this.lifecycleHandlers.set(eventName, handlers);
    return this;
  }

  off(eventName: GatewayClientEvent, handler?: GatewayEventHandler) {
    if (!handler) this.lifecycleHandlers.delete(eventName);
    else this.lifecycleHandlers.get(eventName)?.delete(handler);
    return this;
  }

  private buildUrl() {
    let raw = this.options.host;
    if (!raw.startsWith("ws://") && !raw.startsWith("wss://")) raw = `ws://${raw}`;
    if (!raw.includes("/", 6)) raw += "/ws";
    const url = new URL(raw);
    (this.options as Record<string, unknown>)._token
      ? url.searchParams.set("token", (this.options as Record<string, unknown>)._token as string)
      : url.searchParams.set("key", this.options.key);
    return url.toString();
  }

  private handleOpen() {
    const wasReconnecting = this.reconnectAttempt > 0;
    this.reconnectAttempt = 0;
    this.setState("connected");
    if (wasReconnecting) this.emitLifecycle("reconnected", { socketId: this.currentSocketId });
    for (const channel of this.channels.values()) {
      if (channel.state !== "error") void this.sendSubscribe(channel);
    }
  }

  private handleClose(reason: string) {
    this.ws = null;
    this.setState("disconnected");
    this.emitLifecycle("disconnected", { reason });
    if (!this.manualDisconnect && this.options.autoReconnect) this.scheduleReconnect();
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();
    this.reconnectAttempt += 1;
    const delayMs = reconnectDelay(this.reconnectAttempt);
    this.setState("reconnecting");
    this.emitLifecycle("reconnecting", { attempt: this.reconnectAttempt, delayMs });
    this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async sendSubscribe(channel: GatewayChannel) {
    if (!this.isOpen()) return;

    const type = getChannelType(channel.name);
    let authPayload: SocketAuthPayload | null = null;

    if (type === "private" || type === "presence") {
      try {
        authPayload = await this.resolveAuth(channel);
      } catch {
        channel.state = "error";
        this.emitLifecycle("error", { code: "AUTH_FAILED", message: `Failed to authorize ${channel.name}` });
        return;
      }
    }

    channel.state = "pending";
    this.send({ type: "subscribe", channel: channel.name, auth: authPayload?.auth, channel_data: authPayload?.channel_data ?? null });
  }

  private async resolveAuth(channel: GatewayChannel): Promise<SocketAuthPayload> {
    const response = channel.options?.auth ? await channel.options.auth() : await this.defaultAuth(channel.name);
    if (response instanceof Response) {
      if (!response.ok) throw new Error("Auth failed");
      const payload = await response.json() as { data?: SocketAuthPayload } | SocketAuthPayload;
      return "data" in payload && payload.data ? payload.data : payload as SocketAuthPayload;
    }
    return response;
  }

  private defaultAuth(channelName: string) {
    const fetcher = this.options.fetcher ?? fetch;
    return fetcher(this.options.authEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socket_id: this.socketId, channel_name: channelName })
    });
  }

  private handleMessage(raw: unknown) {
    try {
      const envelope = parseEnvelope(raw);
      if (envelope.type === "system") this.handleSystem(envelope);
      if (envelope.type === "event") this.handleEvent(envelope);
      if (envelope.type === "error") this.emitLifecycle("error", { code: envelope.code ?? "PROTOCOL_ERROR", message: envelope.message ?? "Protocol error" });
    } catch {
      this.emitLifecycle("error", { code: "PROTOCOL_ERROR", message: "Invalid message envelope" });
    }
  }

  private handleSystem(envelope: Extract<GatewayEnvelope, { type: "system" }>) {
    if (envelope.event === "connected" && isRecord(envelope.data) && typeof envelope.data.socketId === "string") {
      this.currentSocketId = envelope.data.socketId;
      this.emitLifecycle("connected", { socketId: this.currentSocketId });
      return;
    }
    if (envelope.event === "subscription_succeeded" && isRecord(envelope.data) && typeof envelope.data.channel === "string") {
      const channel = this.channels.get(envelope.data.channel);
      if (channel) {
        channel.state = "subscribed";
        channel.handleEvent("subscription_succeeded", envelope.data);
      }
    }
    if (envelope.event === "subscription_error" && isRecord(envelope.data) && typeof envelope.data.channel === "string") {
      const channel = this.channels.get(envelope.data.channel);
      if (channel) channel.handleEvent("subscription_error", envelope.data);
    }
  }

  private handleEvent(envelope: Extract<GatewayEnvelope, { type: "event" }>) {
    const channel = this.channels.get(envelope.channel);
    channel?.handleEvent(envelope.event, envelope.data);
    this.globalHandlers.get(envelope.event)?.forEach((handler) => safeCall(handler, envelope.data));
    this.globalHandlers.get("*")?.forEach((handler) => safeCall(handler, envelope.event, envelope.data));
  }

  private send(payload: Record<string, unknown>) {
    if (!this.isOpen()) return;
    this.ws?.send(JSON.stringify(payload));
  }

  private isOpen() {
    return this.ws?.readyState === this.ws?.OPEN;
  }

  private setState(to: GatewayClientState) {
    const from = this.currentState;
    if (from === to) return;
    this.currentState = to;
    this.emitLifecycle("state_change", { from, to });
  }

  private emitLifecycle(eventName: GatewayClientEvent, payload: unknown) {
    this.lifecycleHandlers.get(eventName)?.forEach((handler) => safeCall(handler, payload));
  }
}

export function parseEnvelope(raw: unknown): GatewayEnvelope {
  return parseSocketEnvelope(raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresenceMember(value: unknown): value is PresenceMember {
  return isRecord(value) && typeof value.user_id === "string";
}

function isPresenceSnapshot(value: unknown): value is { members: unknown[]; count: number } {
  return isRecord(value) && Array.isArray(value.members) && typeof value.count === "number";
}

function safeCall(handler: (...args: unknown[]) => void, ...args: unknown[]) {
  try { handler(...args); } catch {}
}

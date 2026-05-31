// React hooks tipis di atas @gateway-realtime/sdk.
// Menyederhanakan pemakaian di komponen: kelola koneksi, subscribe, dan presence
// mengikuti lifecycle komponen (auto cleanup saat unmount).
import { useEffect, useState } from "react";
import {
  GatewayClient,
  type GatewayClientOptions,
  type SubscribeOptions,
  type ChannelEventHandler,
  type PresenceMember,
} from "@gateway-realtime/sdk";

// useGateway membuat & mengelola satu koneksi GatewayClient selama komponen hidup.
// Mengembalikan client (untuk dipakai hook lain) dan state koneksi terkini.
export function useGateway(options: GatewayClientOptions, token?: string) {
  // useState lazy-init: client dibuat sekali & stabil (tidak akses ref saat render).
  const [client] = useState(() => new GatewayClient(options));
  const [state, setState] = useState<string>("idle");

  useEffect(() => {
    if (token) client.setToken(token);
    const onState = (p: unknown) => {
      if (p && typeof p === "object" && "to" in p) setState(String((p as { to: unknown }).to));
    };
    client.on("state_change", onState);
    client.connect();
    return () => {
      client.off("state_change", onState);
      client.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { client, state };
}

// useChannel subscribe ke sebuah channel dan mem-bind handler (map event -> fungsi)
// selama komponen hidup. Otomatis unsubscribe saat unmount.
export function useChannel(
  client: GatewayClient | null,
  channelName: string,
  handlers?: Record<string, ChannelEventHandler>,
  options?: SubscribeOptions,
) {
  useEffect(() => {
    if (!client) return;
    const channel = client.subscribe(channelName, options);
    const entries = Object.entries(handlers ?? {});
    entries.forEach(([event, fn]) => channel.on(event, fn));
    return () => {
      entries.forEach(([event, fn]) => channel.off(event, fn));
      client.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, channelName]);
}

// usePresence subscribe ke presence channel dan melacak daftar member secara reaktif.
export function usePresence(client: GatewayClient | null, channelName: string, options?: SubscribeOptions) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  useEffect(() => {
    if (!client) return;
    const channel = client.subscribe(channelName, options);
    const refresh = () => setMembers(channel.members());
    channel.on("subscription_succeeded", refresh);
    channel.on("member_added", refresh);
    channel.on("member_removed", refresh);
    return () => {
      channel.off("subscription_succeeded", refresh);
      channel.off("member_added", refresh);
      channel.off("member_removed", refresh);
      client.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, channelName]);
  return { members, count: members.length };
}

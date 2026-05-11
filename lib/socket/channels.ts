export type ChannelType = "public" | "private" | "presence" | "wildcard" | "encrypted";
export type SubscribeRole = "admin" | "viewer" | "user";

export type ChannelInfo = {
  name: string;
  type: ChannelType;
  requiresAuth: boolean;
  isWildcard: boolean;
};

export type ChannelValidationResult =
  | { ok: true; channel: ChannelInfo }
  | { ok: false; error: string };

const maxChannelLength = 100;
const channelPattern = /^(?:(?:private-|presence-)?[a-z0-9]+(?:\.[a-z0-9]+)*(?:\.\*)?|[a-z0-9]+\.\*)$/;

export function getChannelType(name: string): ChannelType {
  if (name.includes("*")) return "wildcard";
  if (name.startsWith("presence-")) return "presence";
  if (name.startsWith("private-")) return "private";
  return "public";
}

export function isPrivateChannel(name: string) {
  return getChannelType(name) === "private";
}

export function isPresenceChannel(name: string) {
  return getChannelType(name) === "presence";
}

export function isWildcardChannel(name: string) {
  return getChannelType(name) === "wildcard";
}

export function requiresChannelAuth(name: string) {
  const type = getChannelType(name);
  return type === "private" || type === "presence";
}

export function validateChannelName(name: string): ChannelValidationResult {
  if (!name) return { ok: false, error: "Channel name is required" };
  if (name.length > maxChannelLength) return { ok: false, error: "Channel name must be 100 characters or fewer" };
  if (name !== name.toLowerCase()) return { ok: false, error: "Channel name must be lowercase" };
  if (/\s/.test(name)) return { ok: false, error: "Channel name must not contain spaces" };
  if (name.includes("--")) return { ok: false, error: "Channel name must not contain repeated hyphens" };
  if (name.includes("-") && !name.startsWith("private-") && !name.startsWith("presence-")) return { ok: false, error: "Hyphen is only allowed in private- or presence- prefixes" };
  if ((name.match(/\*/g) ?? []).length > 1) return { ok: false, error: "Wildcard may appear only once" };
  if (name.includes("*") && !name.endsWith(".*")) return { ok: false, error: "Wildcard must be the final dot segment" };
  if (!channelPattern.test(name)) return { ok: false, error: "Channel name must use lowercase dot notation" };

  return {
    ok: true,
    channel: {
      name,
      type: getChannelType(name),
      requiresAuth: requiresChannelAuth(name),
      isWildcard: isWildcardChannel(name)
    }
  };
}

export function assertValidChannelName(name: string) {
  const result = validateChannelName(name);
  if (!result.ok) throw new Error(result.error);
  return result.channel;
}

export function canSubscribeToChannel(name: string, role: SubscribeRole = "user") {
  const result = validateChannelName(name);
  if (!result.ok) return result;
  if (result.channel.isWildcard && role !== "admin" && role !== "viewer") {
    return { ok: false as const, error: "Wildcard subscriptions are restricted to admin or viewer roles" };
  }
  return result;
}

export function channelMatches(subscription: string, publishedChannel: string) {
  const sub = validateChannelName(subscription);
  const published = validateChannelName(publishedChannel);
  if (!sub.ok || !published.ok) return false;
  if (!sub.channel.isWildcard) return subscription === publishedChannel;
  const prefix = subscription.slice(0, -1);
  return publishedChannel.startsWith(prefix);
}

export function toPrivateChannel(domain: string, id: string | number) {
  return assertValidChannelName(`private-${domain}.${id}`).name;
}

export function toPresenceChannel(domain: string, id: string | number) {
  return assertValidChannelName(`presence-${domain}.${id}`).name;
}

export function toEntityChannel(domain: string, id: string | number) {
  return assertValidChannelName(`${domain}.${id}`).name;
}


export function isEncryptedChannel(name: string): boolean { return name.startsWith("private-encrypted-"); }

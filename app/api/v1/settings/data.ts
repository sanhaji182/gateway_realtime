import type { AdminUser, EnvironmentInfo, Settings } from "@/lib/api";

export const settings: Settings & { general: Settings["general"] & { support_email?: string }; security: Settings["security"] & { jwt_secret?: string; ip_whitelist?: string }; rate_limits: Settings["rate_limits"] & { max_connections_per_app?: number } } = {
  general: { display_name: "Internal Event Gateway", base_url: "https://gateway.internal", environment: "production", support_email: "ops@gateway.local" },
  security: { cors_mode: "strict", token_expiry_minutes: 60, jwt_secret: "", ip_whitelist: "10.0.0.0/8\n192.168.0.0/16" },
  rate_limits: { reconnects_per_ip: 10, publish_per_app_per_second: 100, max_connections_per_app: 0 },
  retention: { event_log: "24h", webhook_log: "7d", connection_log: "1h" }
};

export const environment: EnvironmentInfo = {
  gateway_version: "1.2.0",
  go_version: "1.22.3",
  redis_version: "7.2.4",
  redis_status: "connected",
  uptime_seconds: 86400,
  build_commit: "a1b2c3d"
};

export const adminUsers: AdminUser[] = [
  { id: "u_owner", name: "Owner", email: "owner@gateway.local", role: "admin" },
  { id: "u_admin", name: "San Haji", email: "admin@gateway.local", role: "admin" },
  { id: "u_viewer", name: "Viewer", email: "viewer@gateway.local", role: "viewer" }
];

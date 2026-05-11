export type ApiMeta = {
  page?: number;
  per_page?: number;
  total?: number;
};

export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export type ApiErrorShape = {
  error: {
    code: ApiErrorCode | string;
    message: string;
  };
};

export type ApiSuccess<TData, TMeta extends ApiMeta | undefined = undefined> = TMeta extends ApiMeta
  ? { data: TData; meta: TMeta }
  : { data: TData; meta?: ApiMeta };

export type ApiResponse<TData, TMeta extends ApiMeta | undefined = undefined> = ApiSuccess<TData, TMeta> | ApiErrorShape;

export type PaginatedResponse<TData> = ApiSuccess<TData[], Required<Pick<ApiMeta, "page" | "total">> & Partial<Pick<ApiMeta, "per_page">>>;

export type OkResponse = { ok: true };

export type UserRole = "admin" | "editor" | "viewer";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  expires_at: number;
  user: AuthUser;
};

export type HealthStatus = "operational" | "degraded" | "down";
export type TimeRange = "30m" | "1h" | "24h";

export type OverviewKpi = {
  active_connections: number;
  events_per_minute: number;
  webhook_success_rate: number;
  error_rate: number;
};

export type HealthItem = {
  name: string;
  status: HealthStatus;
  detail: string;
};

export type Overview = {
  kpi: OverviewKpi;
  health: HealthItem[];
  recent_events: EventItem[];
  recent_failures: WebhookLogItem[];
};

export type TrafficPoint = {
  ts: number;
  value: number;
};

export type TrafficResponse = {
  points: TrafficPoint[];
};

export type AppStatus = "active" | "inactive";
export type AppWebhookStatus = "ok" | "failed" | "degraded" | "none";

export type AppListItem = {
  id: string;
  name: string;
  status: AppStatus;
  connections: number;
  events_today: number;
  webhook_status: AppWebhookStatus;
  updated_at: string;
};

export type AppEnvironment = "production" | "staging" | "development" | string;

export type CreateAppRequest = {
  name: string;
  environment: AppEnvironment;
};

export type CreateAppResponse = {
  id: string;
  name: string;
  key: string;
  secret: string;
};

export type WebhookEndpoint = {
  id: string;
  url: string;
  events: string[];
  status: AppWebhookStatus;
};

export type AppDetail = {
  id: string;
  name: string;
  status: AppStatus;
  key: string;
  secret: string | null;
  allowed_origins: string[];
  webhook_endpoints: WebhookEndpoint[];
  created_at: string;
};

export type UpdateAppRequest = Partial<Pick<AppDetail, "name" | "status" | "allowed_origins">>;

export type AppStats = {
  peak_connections: { value: number; at: string };
  top_channels: Array<{ name: string; event_count: number }>;
};

export type UpsertWebhookRequest = {
  url?: string;
  events?: string[];
  secret?: string;
  status?: AppWebhookStatus;
};

export type ConnectionState = "live" | "idle";

export type ConnectionItem = {
  socket_id: string;
  app_id: string;
  app_name: string;
  user_id: string;
  ip: string;
  channels: string[];
  channel_count: number;
  connected_at: string;
  last_seen_at: string;
  state: ConnectionState;
};

export type ConnectionDetail = ConnectionItem & {
  user_agent: string;
  subscribed_channels: Array<{ name: string; joined_at: string }>;
  recent_events: Array<{ ts: string; event: string; channel: string }>;
};

export type EventStatus = "ok" | "error";

export type EventItem = {
  id: string;
  app_id: string;
  app_name: string;
  channel: string;
  event: string;
  source: string;
  size_bytes: number;
  status: EventStatus;
  request_id: string;
  published_at: string;
};

export type EventDetail = EventItem & {
  payload: Record<string, unknown>;
  delivery: {
    subscriber_count: number;
    latency_ms: number;
    webhook_triggered: boolean;
    webhook_log_id: string | null;
  };
  raw: Record<string, unknown>;
};

export type WebhookLogStatus = "success" | "failed" | "retrying";

export type WebhookLogItem = {
  id: string;
  app_id: string;
  app_name: string;
  endpoint_url: string;
  event: string;
  status: WebhookLogStatus;
  http_code: number;
  latency_ms: number;
  attempt: number;
  triggered_at: string;
};

export type WebhookLogDetail = WebhookLogItem & {
  request: {
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };
  response: {
    status: number;
    body: string;
    latency_ms: number;
  } | null;
  error: string | null;
  attempts: Array<{ attempt: number; at: string; status: WebhookLogStatus; http_code: number }>;
};

export type RetryWebhookResponse = {
  ok: true;
  new_log_id: string;
};

export type Settings = {
  general: { display_name: string; base_url: string; environment: string };
  security: { cors_mode: "strict" | "permissive" | string; token_expiry_minutes: number };
  rate_limits: { reconnects_per_ip: number; publish_per_app_per_second: number };
  retention: { event_log: string; webhook_log: string; connection_log: string };
};

export type UpdateSettingsRequest = Partial<{
  general: Partial<Settings["general"]>;
  security: Partial<Settings["security"]>;
  rate_limits: Partial<Settings["rate_limits"]>;
  retention: Partial<Settings["retention"]>;
}>;

export type EnvironmentInfo = {
  gateway_version: string;
  go_version: string;
  redis_version: string;
  redis_status: string;
  uptime_seconds: number;
  build_commit: string;
};

export type AdminUser = Required<AuthUser>;

export type InviteAdminUserRequest = {
  email: string;
  role: UserRole;
};

export type UpdateAdminUserRequest = Partial<Pick<AdminUser, "name" | "role" | "email">>;

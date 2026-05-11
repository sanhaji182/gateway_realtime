import { apiClient, authClient, createApiClient, type ApiClientOptions } from "@/lib/api/client";
import type { PaginationQuery, SearchQuery } from "@/lib/api/query";
import type {
  AdminUser,
  AppDetail,
  AppListItem,
  AppStatus,
  AppStats,
  ConnectionDetail,
  ConnectionItem,
  ConnectionState,
  CreateAppRequest,
  CreateAppResponse,
  EnvironmentInfo,
  EventDetail,
  EventItem,
  EventStatus,
  InviteAdminUserRequest,
  LoginRequest,
  LoginResponse,
  OkResponse,
  RetryWebhookResponse,
  Settings,
  TimeRange,
  TrafficResponse,
  UpdateAdminUserRequest,
  UpdateAppRequest,
  UpdateSettingsRequest,
  UpsertWebhookRequest,
  WebhookEndpoint,
  WebhookLogDetail,
  WebhookLogItem,
  WebhookLogStatus,
  Overview
} from "@/lib/api/types";

export type ListAppsQuery = PaginationQuery & SearchQuery & {
  status?: AppStatus;
  sort?: "name" | "status" | "connections" | "events";
};

export type ListConnectionsQuery = PaginationQuery & SearchQuery & {
  app_id?: string;
  state?: ConnectionState;
  channel?: string;
};

export type ListEventsQuery = PaginationQuery & SearchQuery & {
  app_id?: string;
  channel?: string;
  event?: string;
  status?: EventStatus;
  range?: TimeRange;
};

export type ListWebhookLogsQuery = PaginationQuery & SearchQuery & {
  app_id?: string;
  endpoint?: string;
  status?: WebhookLogStatus;
  range?: TimeRange;
};

export function createGatewayApi(options?: ApiClientOptions) {
  const client = createApiClient(options);
  const auth = createApiClient({ ...options, baseUrl: options?.baseUrl ?? "/api/auth" });

  return {
    auth: createAuthEndpoints(auth),
    overview: createOverviewEndpoints(client),
    apps: createAppsEndpoints(client),
    connections: createConnectionsEndpoints(client),
    events: createEventsEndpoints(client),
    webhooks: createWebhooksEndpoints(client),
    settings: createSettingsEndpoints(client),
    adminUsers: createAdminUsersEndpoints(client)
  };
}

function createAuthEndpoints(client = authClient) {
  return {
    login: (body: LoginRequest) => client.post<LoginResponse>("/login", body),
    logout: () => client.post<OkResponse>("/logout"),
    me: () => client.get<Required<LoginResponse["user"]>>("/me")
  };
}

function createOverviewEndpoints(client = apiClient) {
  return {
    get: () => client.get<Overview>("/overview"),
    traffic: (range: TimeRange) => client.get<TrafficResponse>("/overview/traffic", { query: { range } })
  };
}

function createAppsEndpoints(client = apiClient) {
  return {
    list: (query?: ListAppsQuery) => client.get<AppListItem[]>("/apps", { query }),
    create: (body: CreateAppRequest) => client.post<CreateAppResponse>("/apps", body),
    get: (id: string) => client.get<AppDetail>(`/apps/${id}`),
    update: (id: string, body: UpdateAppRequest) => client.patch<AppDetail>(`/apps/${id}`, body),
    rotateSecret: (id: string) => client.post<{ secret: string }>(`/apps/${id}/rotate-secret`),
    revealSecret: (id: string) => client.get<{ secret: string }>(`/apps/${id}/secret`),
    stats: (id: string) => client.get<AppStats>(`/apps/${id}/stats`),
    delete: (id: string) => client.delete<OkResponse>(`/apps/${id}`),
    createWebhook: (id: string, body: UpsertWebhookRequest) => client.post<WebhookEndpoint>(`/apps/${id}/webhooks`, body),
    updateWebhook: (appId: string, webhookId: string, body: UpsertWebhookRequest) => client.patch<WebhookEndpoint>(`/apps/${appId}/webhooks/${webhookId}`, body),
    deleteWebhook: (appId: string, webhookId: string) => client.delete<OkResponse>(`/apps/${appId}/webhooks/${webhookId}`)
  };
}

function createConnectionsEndpoints(client = apiClient) {
  return {
    list: (query?: ListConnectionsQuery) => client.get<ConnectionItem[]>("/connections", { query }),
    get: (socketId: string) => client.get<ConnectionDetail>(`/connections/${socketId}`),
    disconnect: (socketId: string) => client.delete<OkResponse>(`/connections/${socketId}`)
  };
}

function createEventsEndpoints(client = apiClient) {
  return {
    list: (query?: ListEventsQuery) => client.get<EventItem[]>("/events", { query }),
    get: (id: string) => client.get<EventDetail>(`/events/${id}`)
  };
}

function createWebhooksEndpoints(client = apiClient) {
  return {
    listLogs: (query?: ListWebhookLogsQuery) => client.get<WebhookLogItem[]>("/webhooks/logs", { query }),
    getLog: (id: string) => client.get<WebhookLogDetail>(`/webhooks/logs/${id}`),
    retryLog: (id: string) => client.post<RetryWebhookResponse>(`/webhooks/logs/${id}/retry`)
  };
}

function createSettingsEndpoints(client = apiClient) {
  return {
    get: () => client.get<Settings>("/settings"),
    update: (body: UpdateSettingsRequest) => client.patch<Settings>("/settings", body),
    environment: () => client.get<EnvironmentInfo>("/settings/environment")
  };
}

function createAdminUsersEndpoints(client = apiClient) {
  return {
    list: () => client.get<AdminUser[]>("/admin/users"),
    invite: (body: InviteAdminUserRequest) => client.post<AdminUser>("/admin/users/invite", body),
    update: (id: string, body: UpdateAdminUserRequest) => client.patch<AdminUser>(`/admin/users/${id}`, body),
    delete: (id: string) => client.delete<OkResponse>(`/admin/users/${id}`)
  };
}

export const gatewayApi = {
  auth: createAuthEndpoints(),
  overview: createOverviewEndpoints(),
  apps: createAppsEndpoints(),
  connections: createConnectionsEndpoints(),
  events: createEventsEndpoints(),
  webhooks: createWebhooksEndpoints(),
  settings: createSettingsEndpoints(),
  adminUsers: createAdminUsersEndpoints()
};

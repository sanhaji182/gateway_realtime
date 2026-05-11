import { buildQuery, type QueryParams } from "@/lib/api/query";
import type { ApiErrorShape, ApiSuccess } from "@/lib/api/types";

export const API_BASE_URL = "/api/v1";
export const AUTH_BASE_URL = "/api/auth";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor({ code, message, status }: { code: string; message: string; status: number }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  token?: string;
  fetcher?: typeof fetch;
};

export type RequestOptions = Omit<RequestInit, "body"> & {
  query?: QueryParams;
  body?: unknown;
  token?: string;
};

function isApiErrorShape(value: unknown): value is ApiErrorShape {
  return typeof value === "object" && value !== null && "error" in value;
}

export function createApiClient({ baseUrl = API_BASE_URL, token, fetcher = fetch }: ApiClientOptions = {}) {
  async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.token ?? token) headers.set("Authorization", `Bearer ${options.token ?? token}`);

    const response = await fetcher(`${baseUrl}${path}${buildQuery(options.query)}`, {
      ...options,
      headers,
      credentials: options.credentials ?? "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = (await response.json().catch(() => null)) as ApiSuccess<TData> | ApiErrorShape | null;

    if (!response.ok || isApiErrorShape(payload)) {
      const error = isApiErrorShape(payload) ? payload.error : { code: "INTERNAL_ERROR", message: response.statusText || "Request failed" };
      throw new ApiError({ code: error.code, message: error.message, status: response.status });
    }

    return (payload as ApiSuccess<TData>).data;
  }

  return {
    get: <TData>(path: string, options?: RequestOptions) => request<TData>(path, { ...options, method: "GET" }),
    post: <TData>(path: string, body?: unknown, options?: RequestOptions) => request<TData>(path, { ...options, method: "POST", body }),
    patch: <TData>(path: string, body?: unknown, options?: RequestOptions) => request<TData>(path, { ...options, method: "PATCH", body }),
    delete: <TData>(path: string, options?: RequestOptions) => request<TData>(path, { ...options, method: "DELETE" })
  };
}

export const apiClient = createApiClient();
export const authClient = createApiClient({ baseUrl: AUTH_BASE_URL });

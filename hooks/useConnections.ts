// Hook ini mengambil daftar koneksi aktif dengan polling SWR. Dipakai halaman Connections agar tabel terasa realtime tanpa WebSocket dashboard.
"use client";

import useSWR from "swr";
import { gatewayApi, type ConnectionItem, type ConnectionState } from "@/lib/api";

// ConnectionFilters merepresentasikan filter tabel koneksi. Field undefined tidak dikirim agar API memakai default.
export type ConnectionFilters = {
  search?: string;
  app_id?: string;
  state?: ConnectionState;
  channel?: string;
  page?: number;
  per_page?: number;
};

// useConnections mengambil koneksi aktif dengan refresh 5000ms. Interval ini dipakai agar state live cukup cepat tanpa perlu WebSocket khusus dashboard.
export function useConnections(filters: ConnectionFilters) {
  const { data, error, isLoading, mutate } = useSWR<ConnectionItem[]>(["connections", filters], () => gatewayApi.connections.list(filters), { refreshInterval: 5000 });

  return { connections: data, meta: undefined, error, isLoading, mutate };
}

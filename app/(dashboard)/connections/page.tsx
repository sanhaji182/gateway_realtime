"use client";

import { Globe, ShoppingCart, Store, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useConnections } from "@/hooks/useConnections";
import type { ConnectionItem, ConnectionState } from "@/lib/api";

export default function AppsPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [state, setState] = useState<"all" | ConnectionState>("all");
  const query = { search, app_id: appId || undefined, state: state === "all" ? undefined : state, channel: "", page: 1, per_page: 50 };
  const { connections: data, error, isLoading } = useConnections(query);
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((i) => [i.app_id, i.app_name])).entries()), [data]);
  const hasFilters = !!search || !!appId || state !== "all";

  const columns = useMemo<DataTableColumn<ConnectionItem>[]>(() => [
    { accessorKey: "socket_id", header: "Connection ID", meta: { mono: true }, cell: ({ row }) => <span className="text-primary">{row.original.socket_id}</span> },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "channel_count", header: "Channels", cell: ({ row }) => row.original.channel_count },
    { accessorKey: "ip", header: "IP Address", meta: { mono: true } },
    { accessorKey: "connected_at", header: "Connected", cell: ({ row }) => relativeTime(row.original.connected_at) },
    { accessorKey: "last_seen_at", header: "Last Seen", cell: ({ row }) => relativeSeconds(row.original.last_seen_at) },
    { accessorKey: "state", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.state === "live" ? "success" : "warning"}>{row.original.state}</StatusBadge> },
  ], []);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Apps</h1>
          <p className="mt-0.5 text-[12px] text-muted">Active marketplace connections and scraping sessions.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded bg-success-subtle px-2 py-0.5 text-[11px] font-medium text-success">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" /></span>
          {(data ?? []).filter((c) => c.state === "live").length} live
        </span>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filters={<Filters appId={appId} onAppChange={setAppId} state={state} onStateChange={setState} apps={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setState("all"); }}
      />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KPICard label="Active Sessions" value={(data ?? []).filter((c) => c.state === "live").length} color="success" icon={Globe} />
        <KPICard label="Apps" value={appOptions.length} color="accent" icon={Store} />
        <KPICard label="Avg Channels" value={data?.length ? Math.round(data.reduce((s, c) => s + c.channel_count, 0) / data.length) : 0} color="primary" icon={ShoppingCart} />
      </div>

      <div className="mt-4">
        {isLoading ? <SkeletonTable /> : error ? <InlineError /> : data?.length ? <DataTable columns={columns} data={data} /> : <EmptyState icon={WifiOff} title="No active sessions" description="Connections appear when scraping starts." />}
      </div>
    </div>
  );
}

function Filters({ appId, onAppChange, state, onStateChange, apps }: { appId: string; onAppChange: (v: string) => void; state: string; onStateChange: (v: "all" | ConnectionState) => void; apps: [string, string][] }) {
  return <>
    <select value={appId} onChange={(e) => onAppChange(e.target.value)} className="h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"><option value="">All marketplaces</option>{apps.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <select value={state} onChange={(e) => onStateChange(e.target.value as "all" | ConnectionState)} className={state !== "all" ? "h-8 rounded border border-accent bg-surface px-2.5 text-[13px] focus:outline-none" : "h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"}><option value="all">All status</option><option value="live">Live</option><option value="idle">Idle</option></select>
  </>;
}
function SkeletonTable() { return <div className="rounded border bg-surface">{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} columns={7} />)}</div>; }
function InlineError() { return <div className="rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error">Unable to load connections.</div>; }
function relativeTime(v: string) { const m = Math.max(1, Math.round((Date.now() - new Date(v).getTime()) / 60000)); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }
function relativeSeconds(v: string) { const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000)); if (s < 5) return "now"; if (s < 60) return `${s}s ago`; return `${Math.round(s / 60)}m ago`; }

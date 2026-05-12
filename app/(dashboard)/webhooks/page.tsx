"use client";

import { Activity, ArrowLeftRight, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { gatewayApi, type WebhookLogItem, type WebhookLogStatus } from "@/lib/api";

export default function WebhooksPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [status, setStatus] = useState<"all" | WebhookLogStatus>("all");
  const [page, setPage] = useState(1);
  const query = { search, app_id: appId || undefined, endpoint: "", status: status === "all" ? undefined : status, range: "24h" as const, page, per_page: 50 };
  const { data, error, isLoading } = useSWR(["webhook-logs", query], () => gatewayApi.webhooks.listLogs(query), { refreshInterval: 15_000 });
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((i) => [i.app_id, i.app_name])).entries()), [data]);
  const metrics = useMemo(() => buildMetrics(data ?? []), [data]);
  const hasFilters = !!search || !!appId || status !== "all";

  const columns = useMemo<DataTableColumn<WebhookLogItem>[]>(() => [
    { accessorKey: "triggered_at", header: "Time", meta: { mono: true }, cell: ({ row }) => formatTime(row.original.triggered_at) },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "endpoint_url", header: "Endpoint", meta: { mono: true }, cell: ({ row }) => <span className="text-muted">{row.original.endpoint_url}</span> },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={statusV(row.original.status)}>{row.original.status}</StatusBadge> },
    { accessorKey: "latency_ms", header: "Latency", cell: ({ row }) => `${row.original.latency_ms}ms` },
    { accessorKey: "http_code", header: "Code", cell: ({ row }) => <span className={row.original.http_code >= 400 ? "text-error" : "text-success"}>{row.original.http_code}</span> },
  ], []);

  return (
    <div className="space-y-0">
      <div>
        <h1 className="page-title">Webhooks</h1>
        <p className="mt-0.5 text-[12px] text-muted">Monitor webhook delivery — status, latency, HTTP codes, and retry failed deliveries.</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <KPICard label="Success Rate" value={`${metrics.successRate}%`} color="success" icon={TrendingUp} />
            <KPICard label="Avg Latency" value={`${metrics.avgLatency}ms`} color="primary" icon={Activity} />
            <KPICard label="Failed" value={metrics.failed} color="error" subtitle="Last 24h" icon={Activity} />
            <KPICard label="Pending" value={metrics.retrying} color="warning" />
          </>
        )}
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={<Filters appId={appId} onAppChange={setAppId} status={status} onStatusChange={setStatus} apps={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setStatus("all"); setPage(1); }}
      />

      <div className="mt-3">
        {isLoading ? <SkeletonTable /> : error ? <InlineError /> : data?.length ? <DataTable columns={columns} data={data} /> : <EmptyState icon={Activity} title="No webhook deliveries" description="Webhook delivery logs appear when events trigger HTTP callbacks to your endpoints." />}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">{data?.length ?? 0} comparisons</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={!data || data.length < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

function Filters({ appId, onAppChange, status, onStatusChange, apps }: { appId: string; onAppChange: (v: string) => void; status: string; onStatusChange: (v: "all" | WebhookLogStatus) => void; apps: [string, string][] }) {
  return <>
    <select value={appId} onChange={(e) => onAppChange(e.target.value)} className="h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"><option value="">All apps</option>{apps.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <select value={status} onChange={(e) => onStatusChange(e.target.value as "all" | WebhookLogStatus)} className={status !== "all" ? "h-8 rounded border border-accent bg-surface px-2.5 text-[13px] focus:outline-none" : "h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"}><option value="all">All status</option><option value="success">Matched</option><option value="failed">Mismatch</option><option value="retrying">Pending</option></select>
  </>;
}
function SkeletonTable() { return <div className="rounded border bg-surface">{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} columns={7} />)}</div>; }
function InlineError() { return <div className="rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error">Unable to load comparison data.</div>; }
function statusV(s: WebhookLogStatus) { return s === "success" ? "success" : s === "retrying" ? "warning" : "error"; }
function formatTime(v: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(v)); }
function buildMetrics(logs: WebhookLogItem[]) {
  const t = logs.length || 1;
  const ok = logs.filter((i) => i.status === "success").length;
  const fail = logs.filter((i) => i.status === "failed").length;
  const retry = logs.filter((i) => i.status === "retrying").length;
  const avgLat = Math.round(logs.reduce((s, i) => s + i.latency_ms, 0) / t);
  return { successRate: ((ok / t) * 100).toFixed(1), avgLatency: avgLat, failed: fail, retrying: retry };
}

"use client";

import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BarChart3, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard, SkeletonChart, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { gatewayApi } from "@/lib/api";
import type { EventItem, HealthItem, Overview, TimeRange, TrafficPoint, TrafficResponse, WebhookLogItem } from "@/lib/api";

const ranges: TimeRange[] = ["30m", "1h", "24h"];

export default function OverviewPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<WebhookLogItem | null>(null);
  const { data: overview, error: ovErr, isLoading: ovLoading } = useSWR<Overview>("/api/overview", () => gatewayApi.overview.get(), { refreshInterval: 15_000 });
  const { data: traffic, error: trErr, isLoading: trLoading } = useSWR<TrafficResponse>(["/api/overview/traffic", range], ([, r]: [string, TimeRange]) => gatewayApi.overview.traffic(r), { refreshInterval: 15_000 });
  const unhealthy = overview?.health.find((h) => h.status === "down") ?? overview?.health.find((h) => h.status === "degraded");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Gateway Dashboard</h1>
          <p className="mt-0.5 text-[12px] text-muted">Real-time event metrics, connections, and system health at a glance.</p>
        </div>
        <div className="flex items-center gap-1.5 rounded border bg-surface p-0.5 shadow-sm">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={range === r ? "rounded-sm bg-accent px-2.5 py-1 text-[12px] font-medium text-inverse" : "rounded-sm px-2.5 py-1 text-[12px] text-muted hover:text-primary"}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {unhealthy ? (
        <div className="flex items-center gap-2 rounded border border-error bg-error-subtle px-3 py-2 text-[13px] text-error">
          <AlertTriangle className="h-3.5 w-3.5" />
          {unhealthy.name} is {unhealthy.status === "down" ? "down" : "degraded"}: {unhealthy.detail}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ovLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : ovErr ? null : overview ? (
          <>
            <KPICard label="Active Connections" value={overview.kpi.active_connections ?? 0} color="primary" subtitle={`${overview.kpi.events_per_minute ?? 0} active channels`} icon={Activity} />
            <KPICard label="Recent Events" value={overview.recent_events?.length ?? 0} color="warning" subtitle={`${overview.recent_failures?.length ?? 0} active`} icon={Activity} />
            <KPICard label="Webhook Success" value={`98.5%`} color="success" subtitle="Last 24h" icon={Activity} />
            <KPICard label="Events/Minute" value={overview.kpi.events_per_minute ?? 0} color="accent" subtitle="Across all channels" icon={BarChart3} />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded border bg-surface p-4 shadow-sm">
          <h2 className="section-title mb-3">Traffic Overview</h2>
          {trLoading ? <SkeletonChart /> : trErr ? <InlineError message="Unable to load trends." /> : traffic?.points?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={traffic.points} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="ts" tickFormatter={(ts) => formatTime(ts, range)} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12, boxShadow: "var(--shadow-sm)" }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent-subtle)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={BarChart3} title="No traffic data" description="Traffic data will appear as events flow through the system." />}
        </section>

        <section className="rounded border bg-surface p-4 shadow-sm">
          <h2 className="section-title mb-3">Service Health</h2>
          {ovLoading ? <SkeletonChart /> : ovErr ? <InlineError message="Unable to load." /> : overview?.health?.length ? (
            <div className="space-y-1.5">
              {overview.health.map((h) => (
                <div key={h.name} className="flex items-center justify-between gap-2 rounded bg-subtle px-3 py-2">
                  <span className="text-[12px] font-medium text-primary">{h.name}</span>
                  <StatusBadge variant={h.status === "operational" ? "success" : h.status === "degraded" ? "warning" : "error"}>{h.status}</StatusBadge>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Activity} title="No status" description="Service health checks will appear here." />}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Recent Events</h2>
            <Link href="/events" className="text-[12px] text-accent hover:underline">View all</Link>
          </div>
          {ovLoading ? <TableSkeleton /> : ovErr ? <InlineError message="Unable to load." /> : overview?.recent_events?.length ? <RecentTable data={overview.recent_events.slice(0, 8)} onRowClick={setSelectedEvent} /> : <EmptyState icon={Search} title="No events" description="Events appear once publishing is active." />}
        </section>

        <section className="rounded border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Recent Events</h2>
            <Link href="/webhooks?status=failed" className="text-[12px] text-accent hover:underline">View all</Link>
          </div>
          {ovLoading ? <TableSkeleton /> : ovErr ? <InlineError message="Unable to load." /> : overview?.recent_failures?.length ? <AlertTable data={overview.recent_failures.slice(0, 8)} onRowClick={setSelectedAlert} /> : <EmptyState icon={BarChart3} title="No events" description="Recent events from all connected apps." />}
        </section>
      </div>

      <DetailDrawer open={!!selectedEvent} onOpenChange={(o) => !o && setSelectedEvent(null)} title={selectedEvent ? `${selectedEvent.channel} · ${selectedEvent.event}` : "Detail"}>
        {selectedEvent ? <div className="space-y-3 text-[13px]"><Metadata label="App" value={selectedEvent.app_name} /><Metadata label="Channel" value={selectedEvent.channel} /><Metadata label="Event" value={selectedEvent.event} /><Metadata label="Status" value={selectedEvent.status} /><Metadata label="Timestamp" value={formatDateTime(selectedEvent.published_at)} /></div> : null}
      </DetailDrawer>
      <DetailDrawer open={!!selectedAlert} onOpenChange={(o) => !o && setSelectedAlert(null)} title="Alert Detail">
        {selectedAlert ? <div className="space-y-3 text-[13px]"><Metadata label="App" value={selectedAlert.app_name} /><Metadata label="Endpoint" value={selectedAlert.endpoint_url} /><Metadata label="Status" value={String(selectedAlert.status)} /><Metadata label="HTTP" value={String(selectedAlert.http_code)} /><Metadata label="Timestamp" value={formatDateTime(selectedAlert.triggered_at)} /></div> : null}
      </DetailDrawer>
    </div>
  );
}

function RecentTable({ data, onRowClick }: { data: EventItem[]; onRowClick: (e: EventItem) => void }) {
  const columns = useMemo<DataTableColumn<EventItem>[]>(() => [
    { accessorKey: "published_at", header: "Time", cell: ({ row }) => formatDateTime(row.original.published_at), meta: { mono: true } },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "channel", header: "Channel", meta: { mono: true } },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> },
  ], []);
  return <DataTable columns={columns} data={data} onRowClick={onRowClick} />;
}

function AlertTable({ data, onRowClick }: { data: WebhookLogItem[]; onRowClick: (w: WebhookLogItem) => void }) {
  const columns = useMemo<DataTableColumn<WebhookLogItem>[]>(() => [
    { accessorKey: "triggered_at", header: "Time", cell: ({ row }) => formatDateTime(row.original.triggered_at), meta: { mono: true } },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "event", header: "Alert", meta: { mono: true } },
    { accessorKey: "http_code", header: "Code", meta: { mono: true } },
    { accessorKey: "attempt", header: "Retries", cell: ({ row }) => row.original.attempt },
  ], []);
  return <DataTable columns={columns} data={data} onRowClick={onRowClick} />;
}

function Metadata({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 rounded bg-subtle px-3 py-2"><span className="text-muted">{label}</span><span className="mono text-primary">{value}</span></div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="flex items-center gap-2 rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error"><AlertTriangle className="h-3.5 w-3.5" />{message}</div>;
}

function TableSkeleton() {
  return <div className="rounded border bg-surface">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={5} />)}</div>;
}

function formatDateTime(v: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

function formatTime(ts: number, range: TimeRange) {
  return new Intl.DateTimeFormat("en-US", range === "24h" ? { hour: "2-digit" } : { hour: "2-digit", minute: "2-digit" }).format(new Date(ts * 1000));
}

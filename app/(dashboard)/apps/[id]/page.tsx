"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, ExternalLink, Plus, Radio, RefreshCw, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SkeletonCard, SkeletonChart, SkeletonRow } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AppDetail, type AppStats, type EventItem, type TrafficPoint } from "@/lib/api";

export default function AppDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [disableOpen, setDisableOpen] = useState(false);
  const { data: app, error, isLoading, mutate } = useSWR(["app", id], () => gatewayApi.apps.get(id));
  const { data: stats } = useSWR<AppStats & { traffic: TrafficPoint[] }>(["app-stats", id], () => gatewayApi.apps.stats(id) as Promise<AppStats & { traffic: TrafficPoint[] }>);
  const { data: events } = useSWR<EventItem[]>(["app-events", id], () => fetch(`/api/v1/apps/${id}/events`).then(r => r.json()).then(p => p.data));

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error || !app) return <div className="rounded border border-error bg-error-subtle px-4 py-3 text-[13px] text-error">Unable to load app.</div>;

  const environments = ["Production", "Staging", "Development", "Testing"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/apps" className="text-[12px] text-muted hover:text-secondary">&larr; Apps</Link>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="page-title">{app.name}</h1>
            <StatusBadge variant={app.status === "active" ? "success" : "neutral"}>{app.status === "active" ? "Active" : "Inactive"}</StatusBadge>
          </div>
          <p className="mt-1 text-[12px] text-muted">{app.id} · Running across {app.allowed_origins?.length ?? 1} origins · Updated {relativeTime(app.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { mutate(); toast.success("Data refreshed"); }}><RefreshCw className="mr-1 h-3 w-3" />Refresh</Button>
          <Button variant="danger" size="sm" onClick={() => setDisableOpen(true)}>Deactivate</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKpi label="Connections" value="284" color="primary" />
        <MiniKpi label="Event Rate" value="1.2k/min" color="success" subtitle="Staging" />
        <MiniKpi label="Events Today" value="12.4k" color="error" subtitle="Sandbox" />
        <MiniKpi label="Webhook Status" value="OK" color="warning" subtitle="Last 24h" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded border bg-surface p-4 shadow-sm">
          <h2 className="section-title mb-3">Event Traffic</h2>
          {stats?.traffic?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.traffic} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="ts" tickFormatter={(ts) => formatTime(ts)} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent-subtle)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={RefreshCw} title="No traffic data" description="Traffic data appears after events start flowing." />}
        </section>

        <section className="rounded border bg-surface p-4 shadow-sm">
          <h2 className="section-title mb-3">Channel Breakdown</h2>
          <div className="space-y-1.5">
            {environments.map((mp, i) => (
              <div key={mp} className="flex items-center justify-between gap-2 rounded bg-subtle px-3 py-2">
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-muted" />
                  <span className="text-[13px] font-medium text-primary">{mp}</span>
                </div>
                <span className={cn("text-[13px]", i === 0 ? "text-success" : i === 1 ? "text-primary" : "text-error")}>
                  (284 - i * 32).toLocaleString()
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Recent Activity</h2>
          <Link href={`/events?app_id=${id}`} className="text-[12px] text-accent hover:underline">View all</Link>
        </div>
        {events?.length ? <ActivityTable data={events.slice(0, 10)} /> : <EmptyState icon={Radio} title="No activity" description="Event activity appears here." />}
      </section>

      <ConfirmDialog open={disableOpen} onOpenChange={setDisableOpen} title="Deactivate" description="This will deactivate the app. Existing data will be preserved." confirmLabel="Deactivate" onConfirm={() => { setDisableOpen(false); mutate({ ...app, status: "inactive" }, false); toast.success("App deactivated"); }} />
    </div>
  );
}

function MiniKpi({ label, value, color = "primary", subtitle }: { label: string; value: string; color?: string; subtitle?: string }) {
  return (
    <div className="rounded border bg-surface p-3 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tracking-[-0.01em]", color === "success" ? "text-success" : color === "warning" ? "text-warning" : color === "error" ? "text-error" : "text-primary")}>{value}</div>
      {subtitle ? <div className="mt-0.5 text-[12px] text-muted">{subtitle}</div> : null}
    </div>
  );
}

function ActivityTable({ data }: { data: EventItem[] }) {
  const columns = useMemo<DataTableColumn<EventItem>[]>(() => [
    { accessorKey: "published_at", header: "Time", cell: ({ row }) => formatDateTime(row.original.published_at), meta: { mono: true } },
    { accessorKey: "channel", header: "Channel", meta: { mono: true } },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> },
  ], []);
  return <DataTable columns={columns} data={data} />;
}

function cn(...args: (string | false | undefined | null)[]) { return args.filter(Boolean).join(" "); }
function formatTime(ts: number) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit" }).format(new Date(ts * 1000)); }
function formatDateTime(v: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(v)); }
function relativeTime(v: string) { const m = Math.max(1, Math.round((Date.now() - new Date(v).getTime()) / 60000)); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }

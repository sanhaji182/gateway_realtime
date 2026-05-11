// File ini merender halaman Overview berisi KPI, chart traffic, health panel, dan tabel ringkas. Dipakai sebagai landing page operasional dashboard.
"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useTimeRange } from "@/context/TimeRangeContext";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonCard, SkeletonChart, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { gatewayApi } from "@/lib/api";
import type { EventItem, HealthItem, Overview, TimeRange, TrafficPoint, TrafficResponse, WebhookLogItem } from "@/lib/api";

const refreshInterval = 15_000;
const ranges: TimeRange[] = ["30m", "1h", "24h"];

const overviewFetcher = () => gatewayApi.overview.get();
const trafficFetcher = ([, range]: [string, TimeRange]) => gatewayApi.overview.traffic(range);

// OverviewPage merender ringkasan operasional. State lokal hanya untuk drawer selection karena data utama dikelola SWR.
export default function OverviewPage() {
  const { range: timeRange, setRange: setTimeRange } = useTimeRange();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLogItem | null>(null);
  // SWR mengambil KPI, health, recent events, dan failures. refreshInterval 15000ms menjaga overview live tanpa membebani API.
  const { data: overview, error: overviewError, isLoading: overviewLoading } = useSWR<Overview>("/api/overview", overviewFetcher, { refreshInterval });
  // SWR traffic memakai key array agar perubahan timeRange dari context memicu revalidasi chart. Error ditampilkan inline di panel chart.
  const { data: traffic, error: trafficError, isLoading: trafficLoading } = useSWR<TrafficResponse>(["/api/overview/traffic", timeRange], trafficFetcher, { refreshInterval });
  const unhealthy = overview?.health.find((item) => item.status === "down") ?? overview?.health.find((item) => item.status === "degraded");

  return (
    <div className="space-y-6">
      <h1 className="page-title">Overview</h1>

      {unhealthy ? <HealthAlert item={unhealthy} /> : null}

      <KpiRow overview={overview} isLoading={overviewLoading} hasError={!!overviewError} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Traffic"
          action={
            <div className="flex rounded-sm border bg-surface1 p-0.5">
              {ranges.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={timeRange === range ? "rounded-[6px] bg-surface3 px-2.5 py-1 text-xs text-primary" : "rounded-[6px] px-2.5 py-1 text-xs text-muted hover:text-primary"}
                >
                  {range}
                </button>
              ))}
            </div>
          }
        >
          {trafficLoading ? <SkeletonChart /> : trafficError ? <InlineError message="Unable to load traffic data." /> : traffic?.points.length ? <TrafficChart data={traffic.points} range={timeRange} /> : <EmptyState icon={Activity} title="No traffic yet" description="Events per minute will appear once apps start publishing." />}
        </Panel>

        <Panel title="System Health">
          {overviewLoading ? <HealthSkeleton /> : overviewError ? <InlineError message="Unable to load system health." /> : overview?.health.length ? <HealthPanel items={overview.health} /> : <EmptyState icon={Inbox} title="No health checks" description="System component checks will appear when the gateway reports status." />}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Recent Events" action={<ViewAll href="/events" />}>
          {overviewLoading ? <TableSkeleton /> : overviewError ? <InlineError message="Unable to load recent events." /> : overview?.recent_events.length ? <RecentEventsTable data={overview.recent_events.slice(0, 10)} onRowClick={setSelectedEvent} /> : <EmptyState icon={Inbox} title="No events yet" description="Events will appear here once your app starts publishing." />}
        </Panel>

        <Panel title="Webhook Failures" action={<ViewAll href="/webhooks?status=failed" />}>
          {overviewLoading ? <TableSkeleton /> : overviewError ? <InlineError message="Unable to load webhook failures." /> : overview?.recent_failures.length ? <WebhookFailuresTable data={overview.recent_failures.slice(0, 10)} onRowClick={setSelectedWebhook} /> : <EmptyState icon={Inbox} title="No webhook failures" description="Failed webhook deliveries will appear here when retries are needed." />}
        </Panel>
      </div>

      <DetailDrawer open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)} title="Event Detail" metadata={selectedEvent ? eventMetadata(selectedEvent) : undefined} />
      <DetailDrawer open={!!selectedWebhook} onOpenChange={(open) => !open && setSelectedWebhook(null)} title="Webhook Failure" metadata={selectedWebhook ? webhookMetadata(selectedWebhook) : undefined} />
    </div>
  );
}

// KpiRow merender 4 KPI utama. Props loading/error menentukan apakah menampilkan skeleton, inline error, atau data aktual.
function KpiRow({ overview, isLoading, hasError }: { overview?: Overview; isLoading: boolean; hasError: boolean }) {
  if (isLoading) {
    return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</div>;
  }

  if (hasError) return <InlineError message="Unable to load KPI metrics." />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/connections"><KPICard label="Active Connections" value={formatNumber(overview?.kpi.active_connections ?? 0)} delta="↑12 vs 1h ago" color="accent" /></Link>
      <KPICard label="Events / min" value={formatNumber(overview?.kpi.events_per_minute ?? 0)} delta="stable" color="teal" />
      <KPICard label="Webhook OK" value={`${overview?.kpi.webhook_success_rate ?? 0}%`} delta="↓0.2%" color="success" />
      <Link href="/events?status=error"><KPICard label="Error Rate" value={`${overview?.kpi.error_rate ?? 0}%`} delta="↑0.1%" color="warning" /></Link>
    </div>
  );
}

// TrafficChart mengubah point timestamp menjadi label X-axis. useMemo mencegah format ulang saat data/range tidak berubah.
function TrafficChart({ data, range }: { data: TrafficPoint[]; range: TimeRange }) {
  const chartData = useMemo(() => data.map((point) => ({ ...point, label: formatTime(point.ts, range) })), [data, range]);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} width={40} />
          <Tooltip contentStyle={{ background: "var(--bg-surface1)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)" }} labelStyle={{ color: "var(--text-muted)" }} />
          <Area type="monotone" dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.08} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "var(--accent)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// HealthPanel merender status komponen gateway. Status badge dipetakan ke warna semantik agar degraded/down cepat terlihat.
function HealthPanel({ items }: { items: HealthItem[] }) {
  return <div className="space-y-2">{items.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-sm bg-surface3 px-3 py-3"><div><div className="text-sm font-medium text-primary">{item.name}</div><div className="mt-1 text-xs text-muted">{item.detail}</div></div><StatusBadge variant={healthVariant(item.status)}>{healthLabel(item.status)}</StatusBadge></div>)}</div>;
}

function RecentEventsTable({ data, onRowClick }: { data: EventItem[]; onRowClick: (event: EventItem) => void }) {
  const columns = useMemo<DataTableColumn<EventItem>[]>(() => [
    { accessorKey: "published_at", header: "Timestamp", cell: ({ row }) => formatDateTime(row.original.published_at), meta: { mono: true } },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "channel", header: "Channel", meta: { mono: true } },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> }
  ], []);

  return <DataTable columns={columns} data={data} onRowClick={onRowClick} />;
}

function WebhookFailuresTable({ data, onRowClick }: { data: WebhookLogItem[]; onRowClick: (webhook: WebhookLogItem) => void }) {
  const columns = useMemo<DataTableColumn<WebhookLogItem>[]>(() => [
    { accessorKey: "triggered_at", header: "Timestamp", cell: ({ row }) => formatDateTime(row.original.triggered_at), meta: { mono: true } },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "http_code", header: "HTTP Code", meta: { mono: true } },
    { accessorKey: "attempt", header: "Attempt", cell: ({ row }) => row.original.attempt }
  ], []);

  return <DataTable columns={columns} data={data} onRowClick={onRowClick} />;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-md border bg-surface2 p-4"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="section-title">{title}</h2>{action}</div>{children}</section>;
}

function HealthAlert({ item }: { item: HealthItem }) {
  const down = item.status === "down";
  return <div className={down ? "flex items-center gap-2 rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error" : "flex items-center gap-2 rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"}><AlertTriangle className="h-4 w-4" />{item.name} is {healthLabel(item.status).toLowerCase()}: {item.detail}</div>;
}

function InlineError({ message }: { message: string }) {
  return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>;
}

function ViewAll({ href }: { href: string }) {
  return <Link href={href} className="text-sm text-accent hover:underline">View all</Link>;
}

function TableSkeleton() {
  return <div className="rounded-md border bg-surface1">{Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} columns={5} />)}</div>;
}

function HealthSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <SkeletonRow key={index} columns={2} />)}</div>;
}

function healthVariant(status: HealthItem["status"]) {
  if (status === "operational") return "success";
  if (status === "degraded") return "warning";
  return "error";
}

function healthLabel(status: HealthItem["status"]) {
  if (status === "operational") return "Operational";
  if (status === "degraded") return "Degraded";
  return "Down";
}

function eventMetadata(event: EventItem) {
  return { ID: event.id, App: event.app_name, Channel: event.channel, Event: event.event, Status: event.status, "Request ID": event.request_id, Timestamp: formatDateTime(event.published_at) };
}

function webhookMetadata(webhook: WebhookLogItem) {
  return { ID: webhook.id, App: webhook.app_name, Event: webhook.event, Endpoint: webhook.endpoint_url, Status: webhook.status, "HTTP Code": String(webhook.http_code), Attempt: String(webhook.attempt), Timestamp: formatDateTime(webhook.triggered_at) };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function formatTime(ts: number, range: TimeRange) {
  return new Intl.DateTimeFormat("en-US", range === "24h" ? { hour: "2-digit" } : { hour: "2-digit", minute: "2-digit" }).format(new Date(ts * 1000));
}

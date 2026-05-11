// File ini merender detail satu aplikasi, termasuk credentials, origins, webhooks, chart, stats, dan recent events. Dipakai pada route /apps/[id].
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, Inbox, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { SkeletonCard, SkeletonChart, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AppDetail, type AppStats, type EventItem, type TrafficPoint, type WebhookEndpoint } from "@/lib/api";

type StatsWithTraffic = AppStats & { traffic: TrafficPoint[] };

// AppDetailPage merender detail satu aplikasi. State lokal dipakai untuk secret reveal, drawer edit/webhook, dan confirm dialog.
export default function AppDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [secret, setSecret] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEndpoint | null>(null);
  // SWR app mengambil konfigurasi utama aplikasi. mutate dipakai untuk update optimistik origins, status, dan nama.
  const { data: app, error: appError, isLoading: appLoading, mutate } = useSWR(["app", id], () => gatewayApi.apps.get(id));
  // SWR stats mengambil chart traffic, peak connections, dan top channels untuk app ini. Key memakai id agar pindah app memuat data baru.
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR<StatsWithTraffic>(["app-stats", id], () => gatewayApi.apps.stats(id) as Promise<StatsWithTraffic>);
  const { data: events, error: eventsError, isLoading: eventsLoading } = useSWR<EventItem[]>(["app-events", id], () => fetch(`/api/v1/apps/${id}/events`).then((response) => response.json()).then((payload) => payload.data));

  if (appLoading) return <DetailSkeleton />;
  if (appError || !app) return <InlineError message="Unable to load application." />;

  // revealSecret hanya dipanggil saat user klik Reveal agar secret tidak pernah terbuka otomatis di UI.
  async function revealSecret() {
    const result = await gatewayApi.apps.revealSecret(id);
    setSecret(result.secret);
  }

  return (
    <div className="space-y-6">
      <AppHeader app={app} onEdit={() => setEditOpen(true)} onRotate={() => setRotateOpen(true)} onDisable={() => setDisableOpen(true)} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[35fr_65fr]">
        <div className="space-y-4">
          <CredentialsPanel app={app} secret={secret} onReveal={revealSecret} />
          <AllowedOriginsPanel app={app} onChange={(allowed_origins) => mutate({ ...app, allowed_origins }, false)} />
          <WebhookEndpointsPanel app={app} onSelect={setSelectedWebhook} onChange={(webhook_endpoints) => mutate({ ...app, webhook_endpoints }, false)} />
        </div>

        <div className="space-y-4">
          <Panel title="Traffic">
            {statsLoading ? <SkeletonChart /> : statsError ? <InlineError message="Unable to load traffic." /> : stats?.traffic?.length ? <TrafficChart data={stats.traffic} /> : <EmptyState icon={Inbox} title="No traffic" description="Traffic appears once this app publishes events." />}
          </Panel>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title="Peak Connections">{statsLoading ? <SkeletonCard /> : stats?.peak_connections ? <div><div className="text-3xl font-semibold text-accent">{formatNumber(stats.peak_connections.value)}</div><div className="mt-2 text-sm text-muted">Peak at {formatDateTime(stats.peak_connections.at)}</div></div> : <InlineError message="Unable to load peak connections." />}</Panel>
            <Panel title="Top Channels">{statsLoading ? <SkeletonCard /> : stats?.top_channels?.length ? <ol className="space-y-2">{stats.top_channels.map((channel, index) => <li key={channel.name} className="flex items-center justify-between rounded-sm bg-surface3 px-3 py-2"><span className="mono text-sm text-primary">{index + 1}. {channel.name}</span><span className="text-sm text-muted">{formatNumber(channel.event_count)}</span></li>)}</ol> : <EmptyState icon={Inbox} title="No channels" description="Top channels appear after events are published." />}</Panel>
          </div>

          <Panel title="Recent Events" action={<Link href={`/events?app_id=${id}`} className="text-sm text-accent hover:underline">View all</Link>}>
            {eventsLoading ? <TableSkeleton /> : eventsError ? <InlineError message="Unable to load recent events." /> : events?.length ? <RecentEventsTable data={events.slice(0, 10)} /> : <EmptyState icon={Inbox} title="No recent events" description="Recent events for this app will appear here." />}
          </Panel>
        </div>
      </div>

      <EditAppDrawer open={editOpen} onOpenChange={setEditOpen} app={app} onSave={(name) => { mutate({ ...app, name }, false); toast.success("Application updated"); }} />
      <WebhookDrawer open={!!selectedWebhook} onOpenChange={(open) => !open && setSelectedWebhook(null)} webhook={selectedWebhook} />
      <ConfirmDialog open={rotateOpen} onOpenChange={setRotateOpen} title="Rotate secret" description="Existing connections using old secret will be rejected." confirmLabel="Rotate Secret" onConfirm={async () => { const result = await gatewayApi.apps.rotateSecret(id); setSecret(result.secret); setRotateOpen(false); toast.success("Secret rotated"); }} />
      <ConfirmDialog open={disableOpen} onOpenChange={setDisableOpen} title="Disable application" description="Existing clients will stop connecting to this application." confirmLabel="Disable" onConfirm={() => { setDisableOpen(false); mutate({ ...app, status: "inactive" }, false); toast.success("Application disabled"); }} />
    </div>
  );
}

function AppHeader({ app, onEdit, onRotate, onDisable }: { app: AppDetail; onEdit: () => void; onRotate: () => void; onDisable: () => void }) {
  return <div className="flex items-start justify-between gap-4 border-b pb-5"><div><div className="mb-2 text-sm text-muted">Apps / {app.name}</div><div className="flex flex-wrap items-center gap-3"><h1 className="page-title">{app.name}</h1><StatusBadge variant={app.status === "active" ? "success" : "neutral"}>{app.status}</StatusBadge><span className="mono text-xs text-muted">{app.id}</span></div></div><div className="flex gap-2"><Button onClick={onEdit}>Edit</Button><Button onClick={onRotate}>Rotate Secret</Button><Button variant="destructive" onClick={onDisable}>Disable</Button></div></div>;
}

function CredentialsPanel({ app, secret, onReveal }: { app: AppDetail; secret: string | null; onReveal: () => void }) {
  return <Panel title="Credentials"><div className="space-y-2"><Credential label="App ID" value={app.id} /><Credential label="Key" value={app.key} /><div className="flex items-center justify-between gap-3 rounded-sm bg-surface3 px-3 py-2"><div className="min-w-0"><div className="label">Secret</div><div className="mono mt-1 truncate text-sm text-primary">{secret ?? "••••••••"}</div></div><div className="flex gap-1">{secret ? <CopyButton value={secret} /> : <Button variant="ghost" className="h-8" onClick={onReveal}>Reveal</Button>}</div></div></div></Panel>;
}

function Credential({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-sm bg-surface3 px-3 py-2"><div className="min-w-0"><div className="label">{label}</div><div className="mono mt-1 truncate text-sm text-primary">{value}</div></div><CopyButton value={value} /></div>; }
function CopyButton({ value }: { value: string }) { return <button className="focus-ring rounded-sm p-1 text-muted hover:text-primary" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy className="h-4 w-4" /></button>; }

// AllowedOriginsPanel mengelola list origin secara optimistik di parent. Validasi URL sederhana mencegah input non-URL masuk ke state.
function AllowedOriginsPanel({ app, onChange }: { app: AppDetail; onChange: (origins: string[]) => void }) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const input = event.currentTarget.origin as HTMLInputElement; const value = input.value.trim(); try { new URL(value); onChange([...app.allowed_origins, value]); input.value = ""; } catch { setError("Enter a valid URL."); } }
  return <Panel title="Allowed Origins"><div className="space-y-2">{app.allowed_origins.map((origin) => <div key={origin} className="flex items-center justify-between rounded-sm bg-surface3 px-3 py-2"><span className="truncate text-sm text-secondary">{origin}</span><button className="text-muted hover:text-error" onClick={() => onChange(app.allowed_origins.filter((item) => item !== origin))}><X className="h-4 w-4" /></button></div>)}<form onSubmit={submit} className="flex gap-2"><Input name="origin" placeholder="https://example.com" className="flex-1" /><Button type="submit"><Plus className="h-4 w-4" /></Button></form>{error ? <p className="text-sm text-error">{error}</p> : null}</div></Panel>;
}

// WebhookEndpointsPanel merender endpoint dan form inline. onSelect membuka drawer konfigurasi tanpa navigasi halaman.
function WebhookEndpointsPanel({ app, onSelect, onChange }: { app: AppDetail; onSelect: (webhook: WebhookEndpoint) => void; onChange: (webhooks: WebhookEndpoint[]) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const url = (form.url as HTMLInputElement).value.trim(); const events = (form.events as HTMLInputElement).value.split(",").map((item) => item.trim()).filter(Boolean); if (!url) return; onChange([...app.webhook_endpoints, { id: `wh_${Date.now()}`, url, events: events.length ? events : ["*"], status: "ok" }]); form.reset(); }
  return <Panel title="Webhook Endpoints"><div className="space-y-2">{app.webhook_endpoints.map((webhook) => <button key={webhook.id} onClick={() => onSelect(webhook)} className="w-full rounded-sm bg-surface3 px-3 py-2 text-left hover:bg-surface1"><div className="flex items-center justify-between gap-2"><span className="truncate text-sm text-primary">{webhook.url}</span><StatusBadge variant={webhook.status === "ok" ? "success" : webhook.status === "failed" ? "error" : "warning"}>{webhook.status}</StatusBadge></div><div className="mt-1 mono text-xs text-muted">{webhook.events.join(", ")}</div></button>)}<form onSubmit={submit} className="space-y-2"><Input name="url" placeholder="https://api.internal/hook" /><Input name="events" placeholder="order.paid, order.new" /><Button type="submit" className="w-full">Add Endpoint</Button></form></div></Panel>;
}

function TrafficChart({ data }: { data: TrafficPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(point.ts * 1000)) }));
  return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} ticks={[chartData[0]?.label, chartData[6]?.label, chartData[12]?.label, chartData[18]?.label, chartData[23]?.label]} tick={{ fill: "var(--text-muted)", fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} width={40} /><Tooltip contentStyle={{ background: "var(--bg-surface1)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }} /><Area type="monotone" dataKey="value" stroke="var(--teal)" fill="var(--teal)" fillOpacity={0.08} strokeWidth={2} dot={false} /></AreaChart></ResponsiveContainer></div>;
}

function RecentEventsTable({ data }: { data: EventItem[] }) { const columns = useMemo<DataTableColumn<EventItem>[]>(() => [{ accessorKey: "published_at", header: "Time", cell: ({ row }) => formatDateTime(row.original.published_at), meta: { mono: true } }, { accessorKey: "channel", header: "Channel", meta: { mono: true } }, { accessorKey: "event", header: "Event", meta: { mono: true } }, { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> }], []); return <DataTable columns={columns} data={data} />; }
function EditAppDrawer({ open, onOpenChange, app, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; app: AppDetail; onSave: (name: string) => void }) { return <DetailDrawer open={open} onOpenChange={onOpenChange} title="Edit Application"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave(String(new FormData(event.currentTarget).get("name") ?? app.name)); onOpenChange(false); }}><Input name="name" label="Display Name" defaultValue={app.name} /><Button type="submit" variant="default">Save</Button></form></DetailDrawer>; }
function WebhookDrawer({ open, onOpenChange, webhook }: { open: boolean; onOpenChange: (open: boolean) => void; webhook: WebhookEndpoint | null }) { return <DetailDrawer open={open} onOpenChange={onOpenChange} title="Webhook Endpoint" metadata={webhook ? { ID: webhook.id, URL: webhook.url, Events: webhook.events.join(", "), Status: webhook.status } : undefined} />; }
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-md border bg-surface2 p-4"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="section-title">{title}</h2>{action}</div>{children}</section>; }
function TableSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} columns={4} />)}</div>; }
function DetailSkeleton() { return <div className="space-y-4"><SkeletonCard /><div className="grid grid-cols-1 gap-4 xl:grid-cols-[35fr_65fr]"><div className="space-y-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div><div className="space-y-4"><SkeletonChart /><SkeletonCard /></div></div></div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

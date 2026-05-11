// File ini merender Webhook Monitor berisi KPI delivery, filter, tabel log, detail drawer, dan retry. Dipakai untuk observability webhook.
"use client";

import { Check, Copy, Webhook } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input } from "@/components/ui/Input";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { useDrawer } from "@/context/DrawerContext";
import { useTimeRange } from "@/context/TimeRangeContext";
import { gatewayApi, type WebhookLogDetail, type WebhookLogItem, type WebhookLogStatus } from "@/lib/api";

const perPage = 50;

// WebhooksPage merender monitor delivery webhook. State filter dan drawer dipakai untuk investigasi failure/retry.
export default function WebhooksPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [status, setStatus] = useState<"all" | WebhookLogStatus>("all");
  const [page, setPage] = useState(1);
  const drawer = useDrawer<string>();
  const { range } = useTimeRange();
  const { mutate: mutateCache } = useSWRConfig();
  const query = { search, app_id: appId || undefined, endpoint, status: status === "all" ? undefined : status, range, page, per_page: perPage };
  // SWR mengambil log webhook setiap 15 detik. Interval ini cukup untuk observability tanpa spam pada endpoint log.
  const { data, error, isLoading, mutate } = useSWR(["webhook-logs", query], () => gatewayApi.webhooks.listLogs(query), { refreshInterval: 15_000 });
  // SWR detail webhook hanya aktif saat drawer terbuka. Error detail tidak memengaruhi tabel utama.
  const { data: selected, error: selectedError, isLoading: selectedLoading } = useSWR<WebhookLogDetail>(drawer.item ? ["webhook-log", drawer.item] : null, () => gatewayApi.webhooks.getLog(drawer.item as string));
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((item) => [item.app_id, item.app_name])).entries()), [data]);
  const metrics = useMemo(() => buildMetrics(data ?? []), [data]);
  const hasFilters = !!search || !!appId || !!endpoint || status !== "all";

  /* eslint-disable react-hooks/exhaustive-deps -- mutateCache from SWRConfig is stable */
  const columns = useMemo<DataTableColumn<WebhookLogItem>[]>(() => [
    { accessorKey: "triggered_at", header: "Timestamp", meta: { mono: true }, cell: ({ row }) => formatTimestamp(row.original.triggered_at) },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "endpoint_url", header: "Endpoint", meta: { mono: true }, cell: ({ row }) => <span className="text-muted">{row.original.endpoint_url}</span> },
    { accessorKey: "event", header: "Event", meta: { mono: true } },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={statusVariant(row.original.status)}>{row.original.status}</StatusBadge> },
    { accessorKey: "http_code", header: "HTTP Code", cell: ({ row }) => <span className={row.original.http_code >= 400 ? "text-error" : "text-success"}>{row.original.http_code}</span> },
    { accessorKey: "latency_ms", header: "Latency", cell: ({ row }) => row.original.latency_ms >= 30000 ? "timeout" : `${row.original.latency_ms}ms` },
    { accessorKey: "attempt", header: "Attempt", cell: ({ row }) => row.original.attempt > 1 ? <StatusBadge variant="warning">{row.original.attempt}</StatusBadge> : row.original.attempt },
    { id: "actions", header: "", cell: ({ row }) => row.original.status === "failed" || row.original.status === "retrying" ? <Button variant="secondary" className="h-8" onClick={(event) => { event.stopPropagation(); retry(row.original.id, () => mutateCache((key) => Array.isArray(key) && key[0] === "webhook-logs", undefined, { revalidate: true })); }}>Retry</Button> : null }
  ], [mutate]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return (
    <div className="space-y-4">
      <h1 className="page-title">Webhook Monitor</h1>

      {isLoading ? <KpiSkeleton /> : <KpiMiniRow metrics={metrics} onFilterStatus={(value) => { setStatus(value); setPage(1); }} />}

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        filters={<WebhookFilters appId={appId} onAppChange={setAppId} endpoint={endpoint} onEndpointChange={setEndpoint} status={status} onStatusChange={setStatus} appOptions={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setEndpoint(""); setStatus("all"); setPage(1); }}
      />

      {isLoading ? <TableSkeleton /> : error ? <InlineError message="Unable to load webhook deliveries." /> : data?.length ? <DataTable columns={columns} data={data} onRowClick={(log) => drawer.open(log.id)} /> : <EmptyState icon={Webhook} title="No webhook deliveries found" description="Try adjusting your filters or check webhook configuration in app settings." />}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
        <span className="text-sm text-muted">Page {page}</span>
        <Button variant="secondary" disabled={!data || data.length < perPage} onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>

      <WebhookDrawer log={selected} isLoading={selectedLoading} hasError={!!selectedError} open={drawer.isOpen} onOpenChange={(open) => !open && drawer.close()} onRetry={() => selected && retry(selected.id, () => mutateCache((key) => Array.isArray(key) && key[0] === "webhook-logs", undefined, { revalidate: true }))} />
    </div>
  );
}

// KpiMiniRow merender metrik compact. Klik Failed/Retrying mengubah filter status untuk investigasi cepat.
function KpiMiniRow({ metrics, onFilterStatus }: { metrics: ReturnType<typeof buildMetrics>; onFilterStatus: (status: WebhookLogStatus) => void }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-4"><MiniKpi label="Success Rate" value={`${metrics.successRate}%`} color="text-success" /><MiniKpi label="Avg Latency" value={`${metrics.avgLatency}ms`} color="text-teal" /><button onClick={() => onFilterStatus("failed")}><MiniKpi label="Failed" value={metrics.failed} color="text-error" /></button><button onClick={() => onFilterStatus("retrying")}><MiniKpi label="Retrying" value={metrics.retrying} color="text-warning" /></button></div>;
}

function MiniKpi({ label, value, color }: { label: string; value: React.ReactNode; color: string }) { return <section className="rounded-md border bg-surface2 p-3 text-left"><div className="label">{label}</div><div className={`mt-2 text-xl font-semibold tabular-nums ${color}`}>{value}</div></section>; }

function WebhookFilters({ appId, onAppChange, endpoint, onEndpointChange, status, onStatusChange, appOptions }: { appId: string; onAppChange: (value: string) => void; endpoint: string; onEndpointChange: (value: string) => void; status: "all" | WebhookLogStatus; onStatusChange: (value: "all" | WebhookLogStatus) => void; appOptions: Array<[string, string]> }) {
  return <><select value={appId} onChange={(event) => onAppChange(event.target.value)} className={appId ? activeSelect : selectClass}><option value="">All apps</option>{appOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><Input value={endpoint} onChange={(event) => onEndpointChange(event.target.value)} placeholder="Endpoint" className={endpoint ? "border-accent" : undefined} /><select value={status} onChange={(event) => onStatusChange(event.target.value as "all" | WebhookLogStatus)} className={status !== "all" ? activeSelect : selectClass}><option value="all">All status</option><option value="success">success</option><option value="failed">failed</option><option value="retrying">retrying</option></select></>;
}

// WebhookDrawer menampilkan request, response, dan error retry history. Tombol Retry hanya muncul pada failed/retrying.
function WebhookDrawer({ log, isLoading, hasError, open, onOpenChange, onRetry }: { log?: WebhookLogDetail; isLoading: boolean; hasError: boolean; open: boolean; onOpenChange: (open: boolean) => void; onRetry: () => void }) {
  const [tab, setTab] = useState<"request" | "response" | "error">("request");
  const tabs = log?.error ? (["request", "response", "error"] as const) : (["request", "response"] as const);

  return (
    <DetailDrawer open={open} onOpenChange={onOpenChange} title={log ? `${log.app_name} → ${log.event}` : "Webhook Delivery"}>
      {isLoading ? <DrawerSkeleton /> : hasError || !log ? <InlineError message="Unable to load webhook detail." /> : <div className="space-y-4"><div className="flex items-center gap-2"><StatusBadge variant={statusVariant(log.status)}>{log.status}</StatusBadge><span className="text-sm text-muted">{log.attempt} attempts</span></div><div className="flex rounded-sm border bg-surface2 p-0.5">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "flex-1 rounded-[6px] bg-surface3 px-3 py-1.5 text-sm text-primary" : "flex-1 rounded-[6px] px-3 py-1.5 text-sm text-muted hover:text-primary"}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>{tab === "request" ? <RequestTab log={log} /> : null}{tab === "response" ? <ResponseTab log={log} /> : null}{tab === "error" ? <ErrorTab log={log} /> : null}{log.status === "failed" || log.status === "retrying" ? <div className="border-t pt-4"><Button className="border-warning bg-warning text-[#1f1300] hover:opacity-90" onClick={onRetry}>Retry Now</Button></div> : null}</div>}
    </DetailDrawer>
  );
}

function RequestTab({ log }: { log: WebhookLogDetail }) { return <div className="space-y-3"><InfoRow label="Method" value={<span className="mono">{log.request.method}</span>} /><InfoRow label="URL" value={<span className="mono break-all">{log.endpoint_url}</span>} /><JsonViewer value={log.request.headers} label="Headers" /><JsonViewer value={log.request.body} label="Request Body" /></div>; }
function ResponseTab({ log }: { log: WebhookLogDetail }) { const body = log.response?.body ?? "No response body"; return <div className="space-y-3"><InfoRow label="HTTP status" value={<span className={log.http_code >= 400 ? "text-error" : "text-success"}>{log.http_code}</span>} /><InfoRow label="Latency" value={log.latency_ms >= 30000 ? "timeout" : `${log.latency_ms}ms`} /><pre className="max-h-80 overflow-auto rounded-md border bg-surface3 p-3 mono text-sm text-primary">{truncate(body, 2048)}</pre></div>; }
function ErrorTab({ log }: { log: WebhookLogDetail }) { return <div className="space-y-3"><div className="rounded-md border border-error bg-error/10 p-3 text-sm text-error">{log.error ?? "No error recorded."}</div><div className="space-y-2"><div className="label">Retry history</div>{log.attempts.map((attempt) => <div key={attempt.attempt} className="grid grid-cols-[80px_1fr_80px] gap-2 rounded-sm bg-surface3 px-3 py-2 text-sm"><span>#{attempt.attempt}</span><span className="mono text-xs text-muted">{formatFull(attempt.at)}</span><span className={attempt.http_code >= 400 ? "text-error" : "text-success"}>{attempt.http_code}</span></div>)}</div></div>; }
function JsonViewer({ value, label }: { value: unknown; label: string }) { const [copied, setCopied] = useState(false); const json = JSON.stringify(value, null, 2); return <div className="rounded-md border bg-surface2"><div className="flex items-center justify-between border-b px-3 py-2"><div className="label">{label}</div><button onClick={async () => { await navigator.clipboard.writeText(json); setCopied(true); toast.success("Copied JSON"); window.setTimeout(() => setCopied(false), 1200); }} className="focus-ring rounded-sm p-1 text-muted hover:text-primary">{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</button></div><pre className="max-h-80 overflow-auto bg-surface3 p-3 text-[13px] leading-6 text-primary"><code>{json}</code></pre></div>; }
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) { return <div className="grid grid-cols-[120px_1fr] gap-3 rounded-sm bg-surface3 px-3 py-2"><div className="label normal-case tracking-normal">{label}</div><div className="text-sm text-primary">{value}</div></div>; }

// retry mengirim manual retry lalu menginvalidasi cache tabel. Error ditangkap agar SDK/UI host tidak menerima exception mentah.
async function retry(id: string, mutate: () => void) { try { const result = await gatewayApi.webhooks.retryLog(id); toast.success(`Retry queued: ${result.new_log_id}`); mutate(); } catch { toast.error("Failed to retry webhook. Try again."); } }
function buildMetrics(logs: WebhookLogItem[]) { const total = logs.length || 1; const success = logs.filter((item) => item.status === "success").length; const failed = logs.filter((item) => item.status === "failed").length; const retrying = logs.filter((item) => item.status === "retrying").length; const avgLatency = Math.round(logs.reduce((sum, item) => sum + item.latency_ms, 0) / total); return { successRate: ((success / total) * 100).toFixed(1), avgLatency, failed, retrying }; }
const selectClass = "focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm";
const activeSelect = "focus-ring h-9 rounded-sm border border-accent bg-surface1 px-3 text-sm";
function KpiSkeleton() { return <div className="grid grid-cols-1 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)}</div>; }
function TableSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={index} columns={9} />)}</div>; }
function DrawerSkeleton() { return <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={2} />)}</div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function statusVariant(status: WebhookLogStatus) { if (status === "success") return "success"; if (status === "retrying") return "warning"; return "error"; }
function formatTimestamp(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }).format(new Date(value)); }
function formatFull(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)); }
function truncate(value: string, max: number) { return value.length > max ? `${value.slice(0, max)}…` : value; }

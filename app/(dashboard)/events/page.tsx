"use client";

import { Copy, Search, Sparkles, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { useDrawer } from "@/context/DrawerContext";
import { gatewayApi, type EventDetail, type EventItem, type EventStatus } from "@/lib/api";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState<"all" | EventStatus>("all");
  const [page, setPage] = useState(1);
  const drawer = useDrawer<string>();
  const query = { search, app_id: appId || undefined, channel, event: "", status: status === "all" ? undefined : status, range: "24h" as const, page, per_page: 50 };
  const { data, error, isLoading } = useSWR(["events", query], () => gatewayApi.events.list(query), { refreshInterval: 30_000 });
  const { data: selected, error: selErr, isLoading: selLoading } = useSWR<EventDetail>(drawer.item ? ["event", drawer.item] : null, () => gatewayApi.events.get(drawer.item as string));
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((i) => [i.app_id, i.app_name])).entries()), [data]);
  const hasFilters = !!search || !!appId || !!channel || status !== "all";

  const columns = useMemo<DataTableColumn<EventItem>[]>(() => [
    { accessorKey: "published_at", header: "Time", meta: { mono: true }, cell: ({ row }) => formatTimestamp(row.original.published_at) },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "channel", header: "Channel", cell: ({ row }) => <button className="mono text-accent hover:underline" onClick={(e) => { e.stopPropagation(); setChannel(row.original.channel); setPage(1); }}>{row.original.channel}</button> },
    { accessorKey: "event", header: "Event", cell: ({ row }) => <button className="mono text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setSearch(row.original.event); setPage(1); }}>{row.original.event}</button> },
    { accessorKey: "source", header: "Source" },
    { accessorKey: "size_bytes", header: "Size", cell: ({ row }) => formatBytes(row.original.size_bytes) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> },
  ], []);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="mt-0.5 text-[12px] text-muted">Event log — every publish, subscribe, and system event in realtime.</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />AI Summarize
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={<Filters appId={appId} onAppChange={setAppId} channel={channel} onChannelChange={setChannel} status={status} onStatusChange={setStatus} appOptions={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setChannel(""); setStatus("all"); setPage(1); }}
      />

      <div className="mt-3">
        {isLoading ? <SkeletonTable /> : error ? <InlineError /> : data?.length ? <DataTable columns={columns} data={data} onRowClick={(e) => drawer.open(e.id)} /> : <EmptyState icon={Search} title="No data" description="Events appear here as your backend publishes them." />}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">{data?.length ?? 0} events</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={!data || data.length < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <DetailDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="Event Detail">
        {selLoading ? <SkeletonRow columns={4} /> : selErr || !selected ? <InlineError /> : (
          <div className="space-y-4">
            <Field label="App" value={selected.app_name} />
            <Field label="Channel" value={selected.channel} />
            <Field label="Event" value={selected.event} />
            <Field label="Status" value={selected.status} />
            <Field label="Time" value={formatFull(selected.published_at)} />
            <div className="rounded border bg-subtle p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted">Payload</span>
                <button className="text-muted hover:text-primary" onClick={async () => { await navigator.clipboard.writeText(JSON.stringify(selected.payload, null, 2)); toast.success("Copied"); }}>
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <pre className="mono text-[12px] text-primary whitespace-pre-wrap max-h-96 overflow-auto">{JSON.stringify(selected.payload, null, 2)}</pre>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 rounded bg-subtle px-3 py-2"><span className="text-muted text-[13px]">{label}</span><span className="mono text-[13px] text-primary">{value}</span></div>;
}

function Filters({ appId, onAppChange, channel, onChannelChange, status, onStatusChange, appOptions }: { appId: string; onAppChange: (v: string) => void; channel: string; onChannelChange: (v: string) => void; status: "all" | EventStatus; onStatusChange: (v: "all" | EventStatus) => void; appOptions: [string, string][] }) {
  return <>
    <select value={appId} onChange={(e) => onAppChange(e.target.value)} className="h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"><option value="">All apps</option>{appOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
    <select value={status} onChange={(e) => onStatusChange(e.target.value as "all" | EventStatus)} className={status !== "all" ? "h-8 rounded border border-accent bg-surface px-2.5 text-[13px] focus:outline-none" : "h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"}><option value="all">All status</option><option value="ok">OK</option><option value="error">Error</option></select>
  </>;
}

function SkeletonTable() { return <div className="rounded border bg-surface">{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} columns={7} />)}</div>; }
function InlineError() { return <div className="rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error">Unable to load data.</div>; }
function formatTimestamp(v: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(v)); }
function formatFull(v: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(v)); }
function formatBytes(v: number) { return v < 1024 ? `${v} B` : `${(v / 1024).toFixed(1)} KB`; }

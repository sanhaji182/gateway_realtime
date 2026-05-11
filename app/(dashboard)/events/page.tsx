// File ini merender Event Explorer dengan filter, tabel event, dan drawer JSON detail. Dipakai untuk debugging payload dan delivery event.
"use client";

import Link from "next/link";
import { Check, Copy, Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { useDrawer } from "@/context/DrawerContext";
import { useTimeRange } from "@/context/TimeRangeContext";
import { gatewayApi, type EventDetail, type EventItem, type EventStatus, type TimeRange } from "@/lib/api";

const perPage = 50;

// EventsPage merender Event Explorer. Filter lokal, drawer detail, dan timeRange context bersama-sama membentuk query SWR.
export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [channel, setChannel] = useState("");
  const [eventName, setEventName] = useState("");
  const [status, setStatus] = useState<"all" | EventStatus>("all");
  const { range, setRange } = useTimeRange();
  const [page, setPage] = useState(1);
  const drawer = useDrawer<string>();
  const query = { search, app_id: appId || undefined, channel, event: eventName, status: status === "all" ? undefined : status, range, page, per_page: perPage };
  // SWR mengambil event dengan polling adaptif: 30m lebih sering karena biasanya dipakai untuk monitoring live. Error panel tidak memutus drawer/page.
  const { data, error, isLoading } = useSWR(["events", query], () => gatewayApi.events.list(query), { refreshInterval: range === "30m" ? 10_000 : 30_000 });
  // SWR detail event hanya berjalan saat drawer terbuka. Key null mencegah request tidak perlu saat tidak ada event dipilih.
  const { data: selected, error: selectedError, isLoading: selectedLoading } = useSWR<EventDetail>(drawer.item ? ["event", drawer.item] : null, () => gatewayApi.events.get(drawer.item as string));
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((item) => [item.app_id, item.app_name])).entries()), [data]);
  const hasFilters = !!search || !!appId || !!channel || !!eventName || status !== "all";

  const columns = useMemo<DataTableColumn<EventItem>[]>(() => [
    { accessorKey: "published_at", header: "Timestamp", meta: { mono: true }, cell: ({ row }) => formatTimestamp(row.original.published_at) },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "channel", header: "Channel", cell: ({ row }) => <button type="button" className="mono truncate text-accent hover:underline" onClick={(clickEvent) => { clickEvent.stopPropagation(); setChannel(row.original.channel); setPage(1); }}>{row.original.channel}</button> },
    { accessorKey: "event", header: "Event", cell: ({ row }) => <button type="button" className="mono truncate text-primary hover:underline" onClick={(clickEvent) => { clickEvent.stopPropagation(); setEventName(row.original.event); setPage(1); }}>{row.original.event}</button> },
    { accessorKey: "source", header: "Source" },
    { accessorKey: "size_bytes", header: "Size", cell: ({ row }) => formatBytes(row.original.size_bytes) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge variant={row.original.status === "ok" ? "success" : "error"}>{row.original.status}</StatusBadge> },
    { accessorKey: "request_id", header: "Request ID", meta: { mono: true }, cell: ({ row }) => <span className="text-muted">{row.original.request_id}</span> }
  ], []);

  return (
    <div className="space-y-4">
      <h1 className="page-title">Event Explorer</h1>

      <FilterBar
        searchValue={search}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        filters={<EventFilters appId={appId} onAppChange={setAppId} channel={channel} onChannelChange={setChannel} eventName={eventName} onEventChange={setEventName} status={status} onStatusChange={setStatus} range={range} onRangeChange={setRange} appOptions={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setChannel(""); setEventName(""); setStatus("all"); setPage(1); }}
      />

      {isLoading ? <EventsSkeleton /> : error ? <InlineError message="Unable to load events." /> : data?.length ? <DataTable columns={columns} data={data} onRowClick={(event) => drawer.open(event.id)} /> : <EmptyState icon={Inbox} title="No events in this range" description="Try adjusting your filters or time range." />}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
        <span className="text-sm text-muted">Page {page}</span>
        <Button variant="secondary" disabled={!data || data.length < perPage} onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>

      <EventDrawer event={selected} isLoading={selectedLoading} hasError={!!selectedError} open={drawer.isOpen} onOpenChange={(open) => !open && drawer.close()} />
    </div>
  );
}

// EventFilters merender kontrol filter teknis. Channel/event bisa diisi manual atau dari klik cell tabel.
function EventFilters({ appId, onAppChange, channel, onChannelChange, eventName, onEventChange, status, onStatusChange, range, onRangeChange, appOptions }: { appId: string; onAppChange: (value: string) => void; channel: string; onChannelChange: (value: string) => void; eventName: string; onEventChange: (value: string) => void; status: "all" | EventStatus; onStatusChange: (value: "all" | EventStatus) => void; range: TimeRange; onRangeChange: (value: TimeRange) => void; appOptions: Array<[string, string]> }) {
  return (
    <>
      <select value={appId} onChange={(event) => onAppChange(event.target.value)} className={appId ? activeSelect : selectClass}>
        <option value="">All apps</option>
        {appOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <Input value={channel} onChange={(event) => onChannelChange(event.target.value)} placeholder="Channel" className={channel ? "border-accent" : undefined} />
      <Input value={eventName} onChange={(event) => onEventChange(event.target.value)} placeholder="Event" className={eventName ? "border-accent" : undefined} />
      <select value={status} onChange={(event) => onStatusChange(event.target.value as "all" | EventStatus)} className={status !== "all" ? activeSelect : selectClass}>
        <option value="all">All status</option>
        <option value="ok">ok</option>
        <option value="error">error</option>
      </select>
      <select value={range} onChange={(event) => onRangeChange(event.target.value as TimeRange)} className={selectClass}>
        <option value="30m">30m</option>
        <option value="1h">1h</option>
        <option value="24h">24h</option>
      </select>
    </>
  );
}

// EventDrawer menampilkan payload, delivery, dan raw JSON. Tab lokal menjaga panel tetap ringan tanpa route tambahan.
function EventDrawer({ event, isLoading, hasError, open, onOpenChange }: { event?: EventDetail; isLoading: boolean; hasError: boolean; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<"payload" | "delivery" | "raw">("payload");
  const title = event ? `${event.channel} → ${event.event}` : "Event Detail";

  return (
    <DetailDrawer open={open} onOpenChange={onOpenChange} title={title}>
      {isLoading ? <DrawerSkeleton /> : hasError || !event ? <InlineError message="Unable to load event detail." /> : (
        <div className="space-y-4">
          <div className="text-sm text-muted">{event.app_name} · {fullDate(event.published_at)}</div>
          <div className="flex rounded-sm border bg-surface2 p-0.5">
            {(["payload", "delivery", "raw"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "flex-1 rounded-[6px] bg-surface3 px-3 py-1.5 text-sm text-primary" : "flex-1 rounded-[6px] px-3 py-1.5 text-sm text-muted hover:text-primary"}>{item[0].toUpperCase() + item.slice(1)}</button>)}
          </div>
          {tab === "payload" ? <JsonViewer value={event.payload} label="Payload JSON" /> : null}
          {tab === "delivery" ? <DeliveryTab event={event} /> : null}
          {tab === "raw" ? <JsonViewer value={event.raw} label="Raw JSON" /> : null}
        </div>
      )}
    </DetailDrawer>
  );
}

// JsonViewer memformat JSON 2 spasi dan menyediakan copy agar payload/raw mudah dibagikan saat debugging.
function JsonViewer({ value, label }: { value: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(value, null, 2);

  return (
    <div className="rounded-md border bg-surface2">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="label">{label}</div>
        <button type="button" className="focus-ring rounded-sm p-1 text-muted hover:text-primary" onClick={async () => { await navigator.clipboard.writeText(json); setCopied(true); toast.success("Copied JSON"); window.setTimeout(() => setCopied(false), 1200); }}>
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="max-h-[520px] overflow-auto bg-surface3 p-3 text-[13px] leading-6 text-primary"><code>{json}</code></pre>
    </div>
  );
}

function DeliveryTab({ event }: { event: EventDetail }) {
  return (
    <div className="space-y-2 rounded-md border bg-surface2 p-3">
      <InfoRow label="Delivered to" value={`${event.delivery.subscriber_count} subscribers`} />
      <InfoRow label="Delivery latency" value={`${event.delivery.latency_ms} ms`} />
      <InfoRow label="Webhook triggered" value={event.delivery.webhook_triggered ? "Yes" : "No"} />
      {event.delivery.webhook_log_id ? <InfoRow label="Webhook log" value={<Link href={`/webhooks?log_id=${event.delivery.webhook_log_id}`} className="mono text-accent hover:underline">{event.delivery.webhook_log_id}</Link>} /> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="grid grid-cols-[140px_1fr] gap-3 rounded-sm bg-surface3 px-3 py-2"><div className="label normal-case tracking-normal">{label}</div><div className="text-sm text-primary">{value}</div></div>;
}

const selectClass = "focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm";
const activeSelect = "focus-ring h-9 rounded-sm border border-accent bg-surface1 px-3 text-sm";
function EventsSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={index} columns={8} />)}</div>; }
function DrawerSkeleton() { return <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={2} />)}</div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function formatTimestamp(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 }).format(new Date(value)); }
function fullDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)); }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; return `${(value / 1024).toFixed(1)} KB`; }

// File ini merender halaman Connections untuk memantau socket aktif secara live. Dipakai operator untuk melihat detail koneksi dan melakukan disconnect.
"use client";

import { WifiOff } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { useDrawer } from "@/context/DrawerContext";
import { useConnections } from "@/hooks/useConnections";
import { gatewayApi, type ConnectionDetail, type ConnectionItem, type ConnectionState } from "@/lib/api";

const refreshInterval = 5_000;

// ConnectionsPage merender tabel koneksi live. Filter disimpan lokal dan hook useConnections menangani polling SWR.
export default function ConnectionsPage() {
  const [search, setSearch] = useState("");
  const [appId, setAppId] = useState("");
  const [state, setState] = useState<"all" | ConnectionState>("all");
  const [channel, setChannel] = useState("");
  const drawer = useDrawer<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { mutate: mutateCache } = useSWRConfig();
  const query = { search, app_id: appId || undefined, state: state === "all" ? undefined : state, channel, page: 1, per_page: 50 };
  // useConnections mengambil koneksi aktif setiap 5 detik. Error ditampilkan inline agar operator tetap berada di halaman.
  const { connections: data, error, isLoading, mutate } = useConnections(query);
  // SWR detail hanya aktif saat drawer punya socketId. refreshInterval menjaga tab Activity/Last Seen tetap segar saat drawer terbuka.
  const { data: selected, error: selectedError, isLoading: selectedLoading } = useSWR<ConnectionDetail>(drawer.item ? ["connection", drawer.item] : null, () => gatewayApi.connections.get(drawer.item as string), { refreshInterval });
  const appOptions = useMemo(() => Array.from(new Map((data ?? []).map((item) => [item.app_id, item.app_name])).entries()), [data]);
  const hasFilters = !!search || !!appId || state !== "all" || !!channel;

  const columns = useMemo<DataTableColumn<ConnectionItem>[]>(() => [
    { accessorKey: "socket_id", header: "Socket ID", meta: { mono: true }, cell: ({ row }) => <span className="text-primary">{row.original.socket_id}</span> },
    { accessorKey: "app_name", header: "App" },
    { accessorKey: "user_id", header: "User ID", meta: { mono: true }, cell: ({ row }) => row.original.user_id || "-" },
    { accessorKey: "ip", header: "IP", meta: { mono: true } },
    { accessorKey: "channel_count", header: "Channels", cell: ({ row }) => row.original.channel_count },
    { accessorKey: "connected_at", header: "Connected", cell: ({ row }) => connectedLabel(row.original.connected_at) },
    { accessorKey: "last_seen_at", header: "Last Seen", cell: ({ row }) => relativeSeconds(row.original.last_seen_at) },
    { accessorKey: "state", header: "State", cell: ({ row }) => <StatusBadge variant={row.original.state === "live" ? "success" : "warning"}>{row.original.state}</StatusBadge> }
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="page-title">Connections</h1>
        <span className="inline-flex items-center gap-1 rounded-[6px] border border-success bg-success/10 px-2 py-0.5 text-xs font-medium text-success"><span className="animate-pulse">●</span> LIVE</span>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        filters={<ConnectionFilters appId={appId} onAppChange={setAppId} state={state} onStateChange={setState} channel={channel} onChannelChange={setChannel} appOptions={appOptions} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setAppId(""); setState("all"); setChannel(""); }}
      />

      {isLoading ? <ConnectionsSkeleton /> : error ? <InlineError message="Unable to load live connections." /> : data?.length ? <DataTable columns={columns} data={data} onRowClick={(connection) => drawer.open(connection.socket_id)} /> : <EmptyState icon={WifiOff} title="No active connections" description="Connections will appear here once clients connect to the gateway." />}

      <ConnectionDrawer
        connection={selected}
        isLoading={selectedLoading}
        hasError={!!selectedError}
        open={drawer.isOpen}
        onOpenChange={(open) => !open && drawer.close()}
        onDisconnect={() => setConfirmOpen(true)}
        isDisconnecting={disconnecting}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disconnect socket"
        description="This will force the client connection to close immediately. The client may reconnect if configured to do so."
        confirmLabel="Disconnect"
        // onConfirm disconnect melakukan request async, invalidasi cache SWR, lalu menutup drawer jika berhasil; error dikirim lewat toast.
        onConfirm={async () => {
          if (!drawer.item) return;
          setDisconnecting(true);
          try {
            await gatewayApi.connections.disconnect(drawer.item);
            await mutateCache((key) => Array.isArray(key) && key[0] === "connections", undefined, { revalidate: true });
            mutate();
            setConfirmOpen(false);
            drawer.close();
            toast.success("Connection disconnected");
          } catch {
            toast.error("Failed to disconnect. Try again.");
          } finally {
            setDisconnecting(false);
          }
        }}
      />
    </div>
  );
}

// ConnectionFilters merender dropdown app/state dan input channel. Nilai aktif diberi border accent agar filter mudah terlihat.
function ConnectionFilters({ appId, onAppChange, state, onStateChange, channel, onChannelChange, appOptions }: { appId: string; onAppChange: (value: string) => void; state: "all" | ConnectionState; onStateChange: (value: "all" | ConnectionState) => void; channel: string; onChannelChange: (value: string) => void; appOptions: Array<[string, string]> }) {
  return (
    <>
      <select value={appId} onChange={(event) => onAppChange(event.target.value)} className={appId ? "focus-ring h-9 rounded-sm border border-accent bg-surface1 px-3 text-sm" : "focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm"}>
        <option value="">All apps</option>
        {appOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select value={state} onChange={(event) => onStateChange(event.target.value as "all" | ConnectionState)} className={state !== "all" ? "focus-ring h-9 rounded-sm border border-accent bg-surface1 px-3 text-sm" : "focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm"}>
        <option value="all">All states</option>
        <option value="live">Connected</option>
        <option value="idle">Idle</option>
      </select>
      <Input value={channel} onChange={(event) => onChannelChange(event.target.value)} placeholder="Channel" className={channel ? "border-accent" : undefined} />
    </>
  );
}

// ConnectionDrawer menampilkan info, channels, dan activity untuk satu socket. State tab lokal tidak perlu dibagikan ke parent.
function ConnectionDrawer({ connection, isLoading, hasError, open, onOpenChange, onDisconnect, isDisconnecting }: { connection?: ConnectionDetail; isLoading: boolean; hasError: boolean; open: boolean; onOpenChange: (open: boolean) => void; onDisconnect: () => void; isDisconnecting: boolean }) {
  const [tab, setTab] = useState<"info" | "channels" | "activity">("info");

  return (
    <DetailDrawer open={open} onOpenChange={onOpenChange} title="Connection Detail">
      {isLoading ? <DrawerSkeleton /> : hasError || !connection ? <InlineError message="Unable to load connection detail." /> : (
        <div className="space-y-4">
          <div className="flex rounded-sm border bg-surface2 p-0.5">
            {(["info", "channels", "activity"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "flex-1 rounded-[6px] bg-surface3 px-3 py-1.5 text-sm text-primary" : "flex-1 rounded-[6px] px-3 py-1.5 text-sm text-muted hover:text-primary"}>{item[0].toUpperCase() + item.slice(1)}</button>)}
          </div>
          {tab === "info" ? <InfoTab connection={connection} /> : null}
          {tab === "channels" ? <ChannelsTab connection={connection} /> : null}
          {tab === "activity" ? <ActivityTab connection={connection} /> : null}
          <div className="border-t pt-4">
            <Button variant="destructive" loading={isDisconnecting} disabled={connection.state !== "live" || isDisconnecting} title={connection.state !== "live" ? "Only live connections can be disconnected" : undefined} onClick={onDisconnect}>Disconnect</Button>
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}

function InfoTab({ connection }: { connection: ConnectionDetail }) {
  return <dl className="divide-y rounded-md border bg-surface2">{[
    ["Socket ID", connection.socket_id], ["App", connection.app_name], ["User ID", connection.user_id || "-"], ["IP", connection.ip], ["User Agent", connection.user_agent], ["Connected at", fullDate(connection.connected_at)], ["Last seen", fullDate(connection.last_seen_at)], ["State", connection.state]
  ].map(([label, value]) => <div key={label} className="grid grid-cols-[112px_1fr] gap-3 px-3 py-2"><dt className="label normal-case tracking-normal">{label}</dt><dd className={label === "Socket ID" || label === "IP" ? "mono truncate text-xs text-primary" : "truncate text-sm text-secondary"}>{value}</dd></div>)}</dl>;
}

function ChannelsTab({ connection }: { connection: ConnectionDetail }) {
  if (!connection.subscribed_channels.length) return <EmptyState icon={WifiOff} title="No channels" description="This connection has not subscribed to any channels." />;
  return <div className="space-y-2">{connection.subscribed_channels.map((channel) => <div key={channel.name} className="rounded-sm bg-surface3 px-3 py-2"><div className="mono text-sm text-primary">{channel.name}</div><div className="mt-1 text-xs text-muted">Joined {fullDate(channel.joined_at)}</div></div>)}</div>;
}

function ActivityTab({ connection }: { connection: ConnectionDetail }) {
  if (!connection.recent_events.length) return <EmptyState icon={WifiOff} title="No recent activity" description="Recent events received by this connection will appear here." />;
  return <div className="rounded-md border bg-surface1"><div className="grid grid-cols-[120px_1fr_1fr] border-b px-3 py-2 text-xs uppercase tracking-[0.04em] text-muted"><span>Timestamp</span><span>Event</span><span>Channel</span></div>{connection.recent_events.slice(0, 5).map((event) => <div key={`${event.ts}-${event.event}`} className="grid grid-cols-[120px_1fr_1fr] border-b px-3 py-2 text-sm last:border-b-0"><span className="mono text-xs text-muted">{connectedLabel(event.ts)}</span><span className="mono truncate text-primary">{event.event}</span><span className="mono truncate text-secondary">{event.channel}</span></div>)}</div>;
}

function ConnectionsSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={index} columns={8} />)}</div>; }
function DrawerSkeleton() { return <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={2} />)}</div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function connectedLabel(value: string) { return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)); }
function relativeSeconds(value: string) { const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 5) return "just now"; if (seconds < 60) return `${seconds}s ago`; return `${Math.round(seconds / 60)}m ago`; }
function fullDate(value: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)); }

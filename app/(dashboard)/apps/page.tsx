// File ini merender daftar aplikasi, filter, pagination, action menu, dan modal New App. Dipakai pada route /apps untuk operasi app-level.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AppListItem, type AppStatus } from "@/lib/api";

const perPage = 20;

// AppsPage merender daftar aplikasi dengan filter, pagination, modal create, dan action menu. State filter lokal menjadi bagian key SWR.
export default function AppsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AppStatus>("all");
  const [sort, setSort] = useState<"name" | "status" | "connections" | "events">("name");
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const [confirmApp, setConfirmApp] = useState<AppListItem | null>(null);
  // SWR mengambil list aplikasi berdasarkan filter aktif. Key array memastikan perubahan search/status/sort/page otomatis revalidate.
  const { data, error, isLoading, mutate } = useSWR(["apps", search, status, sort, page], () => gatewayApi.apps.list({ search, status: status === "all" ? undefined : status, sort: sort === "events" ? "events" : sort, page, per_page: perPage }));

  const columns = useMemo<DataTableColumn<AppListItem>[]>(() => [
    { accessorKey: "name", header: () => <SortButton label="App Name" active={sort === "name"} onClick={() => setSort("name")} />, cell: ({ row }) => <Link href={`/apps/${row.original.id}`} className="font-semibold text-primary hover:underline" onClick={(event) => event.stopPropagation()}>{row.original.name}</Link> },
    { accessorKey: "id", header: "App ID", meta: { mono: true }, cell: ({ row }) => <span className="text-muted">{row.original.id}</span> },
    { accessorKey: "status", header: () => <SortButton label="Status" active={sort === "status"} onClick={() => setSort("status")} />, cell: ({ row }) => <StatusBadge variant={row.original.status === "active" ? "success" : "neutral"}>{row.original.status}</StatusBadge> },
    { accessorKey: "connections", header: () => <SortButton label="Connections" active={sort === "connections"} onClick={() => setSort("connections")} />, cell: ({ row }) => formatNumber(row.original.connections) },
    { accessorKey: "events_today", header: () => <SortButton label="Events Today" active={sort === "events"} onClick={() => setSort("events")} />, cell: ({ row }) => formatNumber(row.original.events_today) },
    { accessorKey: "webhook_status", header: "Webhook", cell: ({ row }) => <StatusBadge variant={webhookVariant(row.original.webhook_status)}>{webhookLabel(row.original.webhook_status)}</StatusBadge> },
    { accessorKey: "updated_at", header: "Updated", cell: ({ row }) => relativeTime(row.original.updated_at) },
    { id: "actions", header: "Actions", cell: ({ row }) => <ActionsMenu app={row.original} onDisable={() => setConfirmApp(row.original)} /> }
  ], [sort]);

  const hasFilters = !!search || status !== "all";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Applications</h1>
        <Button variant="default" onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" />New App</Button>
      </div>

      <FilterBar searchValue={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} filters={<StatusFilter value={status} onChange={(value) => { setStatus(value); setPage(1); }} sort={sort} onSortChange={setSort} />} hasActiveFilters={hasFilters} onReset={() => { setSearch(""); setStatus("all"); setPage(1); }} />

      {isLoading ? <AppsSkeleton /> : error ? <InlineError message="Unable to load applications." /> : data?.length ? <><div className="hidden md:block"><DataTable columns={columns} data={data} onRowClick={(app) => router.push(`/apps/${app.id}`)} /></div><AppsMobileList data={data} /></> : <EmptyState icon={Plus} title="No applications" description="Create an app to start publishing realtime events." action={<Button onClick={() => setNewOpen(true)}>New App</Button>} />}

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
        <span className="text-sm text-muted">Page {page}</span>
        <Button variant="secondary" disabled={!data || data.length < perPage} onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>

      <NewAppDialog open={newOpen} onOpenChange={setNewOpen} onCreated={() => { mutate(); toast.success("Application created"); }} />
      <ConfirmDialog open={!!confirmApp} onOpenChange={(open) => !open && setConfirmApp(null)} title="Disable application" description="Existing clients will stop connecting to this application." confirmLabel="Disable" onConfirm={() => { setConfirmApp(null); toast.success("Application disabled"); }} />
    </div>
  );
}

// AppsMobileList adalah versi card untuk mobile karena tabel teknis sulit dibaca di layar kecil.
function AppsMobileList({ data }: { data: AppListItem[] }) {
  return <div className="space-y-3 md:hidden">{data.map((app) => <Link key={app.id} href={`/apps/${app.id}`} className="block rounded-md border bg-surface2 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-primary">{app.name}</div><div className="mono mt-1 text-xs text-muted">{app.id}</div></div><StatusBadge variant={app.status === "active" ? "success" : "neutral"}>{app.status}</StatusBadge></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><div className="label">Connections</div><div className="text-primary">{formatNumber(app.connections)}</div></div><div><div className="label">Events Today</div><div className="text-primary">{formatNumber(app.events_today)}</div></div></div></Link>)}</div>;
}

// NewAppDialog merender form create app. onCreated dipanggil parent untuk mutate tabel dan menampilkan toast sukses.
function NewAppDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // submit membuat app baru lewat API. Async diperlukan agar modal hanya ditutup setelah request berhasil.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      await gatewayApi.apps.create({ name: String(form.get("name") ?? ""), environment: String(form.get("environment") ?? "production") });
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Unable to create application.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-surface1 p-5 shadow-none focus:outline-none">
          <div className="flex items-center justify-between"><Dialog.Title className="text-base font-semibold">New App</Dialog.Title><Dialog.Close asChild><Button variant="ghost" className="h-8 w-8 px-0"><X className="h-4 w-4" /></Button></Dialog.Close></div>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Input name="name" label="Display Name" required />
            <label className="block space-y-2"><span className="label block">Environment</span><select name="environment" className="focus-ring h-9 w-full rounded-sm border bg-surface2 px-3 text-sm"><option value="production">production</option><option value="staging">staging</option><option value="dev">dev</option></select></label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <Button type="submit" variant="default" loading={isLoading} className="w-full">Create App</Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ActionsMenu merender dropdown row. event.stopPropagation di trigger mencegah klik menu ikut membuka detail row.
function ActionsMenu({ app, onDisable }: { app: AppListItem; onDisable: () => void }) {
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><Button variant="ghost" className="h-8 w-8 px-0" onClick={(event) => event.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="z-50 min-w-36 rounded-sm border bg-surface1 p-1 text-sm shadow-none" align="end"><DropdownItem href={`/apps/${app.id}`}>Edit</DropdownItem><DropdownMenu.Item className="cursor-pointer rounded-[6px] px-2 py-1.5 text-secondary outline-none hover:bg-surface2 hover:text-primary">Rotate</DropdownMenu.Item><DropdownMenu.Item onClick={onDisable} className="cursor-pointer rounded-[6px] px-2 py-1.5 text-error outline-none hover:bg-error/10">Disable</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}

function DropdownItem({ href, children }: { href: string; children: React.ReactNode }) { return <DropdownMenu.Item asChild><Link href={href} className="block cursor-pointer rounded-[6px] px-2 py-1.5 text-secondary outline-none hover:bg-surface2 hover:text-primary">{children}</Link></DropdownMenu.Item>; }
function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={active ? "text-primary" : "text-muted"}>{label}</button>; }
function StatusFilter({ value, onChange, sort, onSortChange }: { value: "all" | AppStatus; onChange: (value: "all" | AppStatus) => void; sort: string; onSortChange: (value: "name" | "status" | "connections" | "events") => void }) { return <><select value={value} onChange={(event) => onChange(event.target.value as "all" | AppStatus)} className={value !== "all" ? "focus-ring h-9 rounded-sm border border-accent bg-surface1 px-3 text-sm" : "focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm"}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select><select value={sort} onChange={(event) => onSortChange(event.target.value as "name" | "status" | "connections" | "events")} className="focus-ring h-9 rounded-sm border bg-surface1 px-3 text-sm"><option value="name">Sort: name</option><option value="status">Sort: status</option><option value="connections">Sort: connections</option><option value="events">Sort: events</option></select></>; }
function AppsSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 8 }).map((_, index) => <SkeletonRow key={index} columns={8} />)}</div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function webhookVariant(status: string) { if (status === "ok") return "success"; if (status === "degraded") return "warning"; if (status === "failed") return "error"; return "neutral"; }
function webhookLabel(status: string) { if (status === "none") return "off"; if (status === "degraded") return "warn"; if (status === "failed") return "error"; return status; }
function formatNumber(value: number) { return new Intl.NumberFormat("en-US").format(value); }
function relativeTime(value: string) { const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000)); if (minutes < 60) return `${minutes}m ago`; return `${Math.round(minutes / 60)}h ago`; }

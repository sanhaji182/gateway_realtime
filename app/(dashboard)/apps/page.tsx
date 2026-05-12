"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Input } from "@/components/ui/Input";
import { SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AppListItem, type AppStatus } from "@/lib/api";

const perPage = 20;

export default function AppsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | AppStatus>("all");
  const [sort, setSort] = useState<"name" | "status" | "connections" | "events">("name");
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(["apps", search, status, sort, page], () => gatewayApi.apps.list({ search, status: status === "all" ? undefined : status, sort: sort === "events" ? "events" : sort, page, per_page: perPage }));

  const columns = useMemo<DataTableColumn<AppListItem>[]>(() => [
    { accessorKey: "name", header: () => <SortBtn label="Name" active={sort === "name"} onClick={() => setSort("name")} />, cell: ({ row }) => <Link href={`/apps/${row.original.id}`} className="font-medium text-primary hover:text-accent" onClick={(e) => e.stopPropagation()}>{row.original.name}</Link> },
    { accessorKey: "id", header: "App ID", meta: { mono: true }, cell: ({ row }) => <span className="text-muted">{row.original.id}</span> },
    { accessorKey: "status", header: () => <SortBtn label="Status" active={sort === "status"} onClick={() => setSort("status")} />, cell: ({ row }) => <StatusBadge variant={row.original.status === "active" ? "success" : "neutral"}>{row.original.status}</StatusBadge> },
    { accessorKey: "connections", header: () => <SortBtn label="Connections" active={sort === "connections"} onClick={() => setSort("connections")} />, cell: ({ row }) => row.original.connections },
    { accessorKey: "events_today", header: () => <SortBtn label="Events Today" active={sort === "events"} onClick={() => setSort("events")} />, cell: ({ row }) => row.original.events_today },
    { accessorKey: "updated_at", header: "Updated", cell: ({ row }) => relativeTime(row.original.updated_at) },
    { id: "actions", header: "", cell: ({ row }) => <ActionsMenu app={row.original} /> },
  ], [sort]);

  const hasFilters = !!search || status !== "all";

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Apps</h1>
          <p className="mt-0.5 text-[12px] text-muted">Manage apps, API keys, and webhook endpoints.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />New App
        </Button>
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={<Filters value={status} onChange={(v) => { setStatus(v); setPage(1); }} sort={sort} onSortChange={setSort} />}
        hasActiveFilters={hasFilters}
        onReset={() => { setSearch(""); setStatus("all"); setPage(1); }}
      />

      <div className="mt-3">
        {isLoading ? <SkeletonTable /> : error ? <InlineError /> : data?.length ? <DataTable columns={columns} data={data} onRowClick={(app) => router.push(`/apps/${app.id}`)} /> : <EmptyState icon={Search} title="No apps found" description="Create an app to get API credentials." action={<Button variant="primary" size="sm" onClick={() => setNewOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />New App</Button>} />}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">{data?.length ?? 0} apps</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="secondary" size="sm" disabled={!data || data.length < perPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <NewAppModal open={newOpen} onOpenChange={setNewOpen} onCreated={() => { setNewOpen(false); setPage(1); mutate(); }} />
    </div>
  );
}

function NewAppModal({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [originUrl, setOriginUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("App name is required."); return; }
    setIsLoading(true);
    setError("");
    try {
      await gatewayApi.apps.create({ name, environment } as any);
      toast.success("App created");
      onCreated();
    } catch { setError("Failed to create app. Try again."); }
    finally { setIsLoading(false); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded border bg-surface p-5 shadow-sm focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[14px] font-semibold">Create New App</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost" size="sm" className="h-7 w-7 px-0"><X className="h-3.5 w-3.5" /></Button></Dialog.Close>
          </div>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <Input name="name" label="App Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. my-app" required />
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-secondary">Environment</span>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="h-8 w-full rounded border bg-surface px-2.5 text-[13px] text-primary focus:border-accent focus:outline-none">
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
                <option value="testing">Testing</option>
              </select>
            </label>
            <Input name="url" label="Allowed Origin" value={originUrl} onChange={(e) => setOriginUrl(e.target.value)} placeholder="https://my-app.com" />
            {error ? <p className="text-[12px] text-error">{error}</p> : null}
            <Button type="submit" variant="primary" loading={isLoading} className="w-full">Create App</Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ActionsMenu({ app }: { app: AppListItem }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="z-50 min-w-[140px] rounded border bg-surface p-1 shadow-sm" align="end">
          <DropdownMenu.Item asChild><Link href={`/apps/${app.id}`} className="block cursor-pointer rounded px-2 py-1.5 text-[13px] text-secondary hover:bg-hover hover:text-primary outline-none">View Details</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href={`/apps/${app.id}`} className="block cursor-pointer rounded px-2 py-1.5 text-[13px] text-secondary hover:bg-hover hover:text-primary outline-none">API Credentials</Link></DropdownMenu.Item>
          <DropdownMenu.Item className="cursor-pointer rounded px-2 py-1.5 text-[13px] text-error hover:bg-error-subtle outline-none">Deactivate</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SortBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={active ? "text-primary" : "text-muted hover:text-secondary"}>{label}</button>;
}

function Filters({ value, onChange, sort, onSortChange }: { value: "all" | AppStatus; onChange: (v: "all" | AppStatus) => void; sort: "name" | "status" | "connections" | "events"; onSortChange: (v: "name" | "status" | "connections" | "events") => void }) {
  const s = value !== "all" ? "h-8 rounded border border-accent bg-surface px-2.5 text-[13px] focus:outline-none" : "h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none";
  return <>
    <select value={value} onChange={(e) => onChange(e.target.value as "all" | AppStatus)} className={s}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
    <select value={sort} onChange={(e) => onSortChange(e.target.value as "name" | "status" | "connections" | "events")} className="h-8 rounded border bg-surface px-2.5 text-[13px] focus:outline-none"><option value="name">Name</option><option value="status">Status</option><option value="connections">Connections</option><option value="events">Events</option></select>
  </>;
}

function SkeletonTable() { return <div className="rounded border bg-surface">{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} columns={7} />)}</div>; }
function InlineError() { return <div className="rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error">Unable to load apps.</div>; }
function relativeTime(v: string) { const m = Math.max(1, Math.round((Date.now() - new Date(v).getTime()) / 60000)); return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`; }

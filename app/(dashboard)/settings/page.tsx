"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Plus, Server, Trash2, X } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AdminUser, type EnvironmentInfo, type Settings } from "@/lib/api";

type Tab = "general" | "security" | "rate-limits" | "admin-users" | "environment";

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "general", label: "General" },
  { value: "security", label: "Security" },
  { value: "rate-limits", label: "Rate Limits" },
  { value: "admin-users", label: "Team" },
  { value: "environment", label: "Environment" },
];

export default function SettingsPage() {
  return <Suspense fallback={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} height={80} />)}</div>}><SettingsContent /></Suspense>;
}

function SettingsContent() {
  const sp = useSearchParams();
  const tab = (sp.get("tab") as Tab) || "general";
  const active = tabs.some((t) => t.value === tab) ? tab : "general";
  const { data: settings, error, isLoading, mutate } = useSWR<Settings>("/api/settings", () => gatewayApi.settings.get() as Promise<Settings>);
  const { data: env } = useSWR<EnvironmentInfo>("/api/settings/environment", () => gatewayApi.settings.environment());
  const { data: users, mutate: mutateUsers } = useSWR<AdminUser[]>("/api/v1/admin/users", () => gatewayApi.adminUsers.list() as Promise<AdminUser[]>);
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settings) { setForm(settings); setSaved(settings); }
  }, [settings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);

  function update(path: string, value: string | number) {
    setForm((c) => {
      if (!c) return c;
      const n = structuredClone(c);
      const [s, k] = path.split(".");
      (n[s as keyof Settings] as Record<string, unknown>)[k] = value;
      return n;
    });
  }

  async function save() {
    if (!form) return;
    await gatewayApi.settings.update(form);
    setSaved(form);
    mutate(form, false);
    toast.success("Saved");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="mt-0.5 text-[12px] text-muted">Configure scraping behavior, team access, and environment variables.</p>
      </div>

      <nav className="flex gap-4 border-b">
        {tabs.map((t) => (
          <a key={t.value} href={`/settings?tab=${t.value}`} className={active === t.value ? "border-b-2 border-accent pb-2 text-[13px] font-medium text-primary" : "pb-2 text-[13px] text-muted hover:text-secondary"}>{t.label}</a>
        ))}
      </nav>

      {isLoading ? <SkeletonBlock height={200} /> : error ? <InlineError /> : !form ? null : (
        <div className="max-w-[600px] space-y-4">
          {active === "general" ? <GeneralTab form={form} update={update} /> : null}
          {active === "security" ? <SecurityTab form={form} update={update} /> : null}
          {active === "rate-limits" ? <RateLimitsTab form={form} update={update} /> : null}
          {active === "admin-users" ? <AdminUsersTab users={users} mutate={mutateUsers} /> : null}
          {active === "environment" ? <EnvTab env={env} /> : null}
        </div>
      )}

      {active !== "admin-users" && active !== "environment" && (
        <div className={dirty ? "fixed bottom-0 left-[var(--sidebar-w)] right-0 z-40 border-t bg-surface px-5 py-2.5" : "fixed bottom-0 left-[var(--sidebar-w)] right-0 z-40 translate-y-full border-t bg-surface px-5 py-2.5"}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted">Unsaved changes</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setForm(saved); toast.success("Discarded"); }}>Discard</Button>
              <Button variant="primary" size="sm" disabled={!dirty} onClick={save}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneralTab({ form, update }: { form: Settings; update: (path: string, value: string | number) => void }) {
  return <div className="space-y-3 rounded border bg-surface p-4 shadow-sm">
    <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-secondary">General</h3>
    <Field label="Display Name" value={form.general.display_name} onChange={(v) => update("general.display_name", v)} />
    <Field label="Base URL" value={form.general.base_url} onChange={(v) => update("general.base_url", v)} />
  </div>;
}

function SecurityTab({ form, update }: { form: Settings; update: (path: string, value: string | number) => void }) {
  const [showKey, setShowKey] = useState(false);
  return <div className="space-y-3 rounded border bg-surface p-4 shadow-sm">
    <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-secondary">Security</h3>
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-secondary">JWT Secret</span>
      <div className="flex gap-2">
        <input type={showKey ? "text" : "password"} value={form.security.cors_mode} onChange={(e) => update("security.jwt_secret", e.target.value)} className="h-8 flex-1 rounded border bg-surface px-2.5 text-[13px] text-primary font-mono focus:border-accent focus:outline-none" />
        <Button variant="secondary" size="sm" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
      </div>
    </label>
    <Field label="Token Expiry (minutes)" value={String(form.security.token_expiry_minutes)} onChange={(v) => update("security.token_expiry_minutes", Number(v))} type="number" />
  </div>;
}

function RateLimitsTab({ form, update }: { form: Settings; update: (path: string, value: string | number) => void }) {
  return <div className="space-y-3 rounded border bg-surface p-4 shadow-sm">
    <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-secondary">Rate Limits</h3>
    <Field label="Reconnects per IP" value={String(form.rate_limits.reconnects_per_ip)} onChange={(v) => update("rate_limits.reconnects_per_ip", Number(v))} type="number" />
    <Field label="Publish per App per Second" value={String(form.rate_limits.publish_per_app_per_second)} onChange={(v) => update("rate_limits.publish_per_app_per_second", Number(v))} type="number" />
  </div>;
}

function AdminUsersTab({ users, mutate }: { users?: AdminUser[]; mutate: () => void }) {
  const [showInvite, setShowInvite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function deleteUser(id: string) {
    await gatewayApi.adminUsers.delete(id);
    mutate();
    toast.success("User removed");
  }

  const columns = useMemo<DataTableColumn<AdminUser>[]>(() => [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email", meta: { mono: true } },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <StatusBadge variant={row.original.role === "admin" ? "accent" : "neutral"}>{row.original.role}</StatusBadge> },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "-" },
    { id: "actions", header: "", cell: ({ row }) => row.original.role !== "admin" ? <Button variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={(e) => { e.stopPropagation(); setConfirmDelete(row.original.id); }}><Trash2 className="h-3.5 w-3.5 text-muted" /></Button> : null },
  ], []);

  return <div className="rounded border bg-surface shadow-sm">
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-secondary">Team</h3>
      <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}><Plus className="mr-1 h-3 w-3" />Invite</Button>
    </div>
    {users?.length ? <DataTable columns={columns} data={users} /> : <EmptyState icon={Server} title="No team members" description="Invite team members to manage scraping." />}

    <InviteModal open={showInvite} onOpenChange={setShowInvite} onInvited={mutate} />
    {confirmDelete ? (
      <Dialog.Root open onOpenChange={() => setConfirmDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded border bg-surface p-5 shadow-sm focus:outline-none">
            <Dialog.Title className="text-[14px] font-semibold">Remove user</Dialog.Title>
            <Dialog.Description className="mt-2 text-[13px] text-secondary">This user will lose access immediately.</Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild><Button variant="secondary" size="sm">Cancel</Button></Dialog.Close>
              <Button variant="danger" size="sm" onClick={() => { deleteUser(confirmDelete); setConfirmDelete(null); }}>Remove</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    ) : null}
  </div>;
}

function InviteModal({ open, onOpenChange, onInvited }: { open: boolean; onOpenChange: (o: boolean) => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await gatewayApi.adminUsers.invite({ email, role } as AdminUser & { role: string });
      toast.success("Invitation sent");
      onOpenChange(false);
      onInvited();
    } catch { toast.error("Failed to invite"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded border bg-surface p-5 shadow-sm focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[14px] font-semibold">Invite Team Member</Dialog.Title>
            <Dialog.Close asChild><Button variant="ghost" size="sm" className="h-7 w-7 px-0"><X className="h-3.5 w-3.5" /></Button></Dialog.Close>
          </div>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required />
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-secondary">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="h-8 w-full rounded border bg-surface px-2.5 text-[13px] focus:outline-none"><option value="admin">Admin</option><option value="viewer">Viewer</option></select>
            </label>
            <Button type="submit" variant="primary" loading={loading} className="w-full">Send Invitation</Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EnvTab({ env }: { env?: EnvironmentInfo }) {
  return <div className="space-y-3 rounded border bg-surface p-4 shadow-sm">
    <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-secondary">Environment</h3>
    {env ? (
      <div className="space-y-1">
        {Object.entries(env).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 rounded bg-subtle px-3 py-2">
            <span className="text-[12px] text-muted uppercase tracking-[0.03em]">{k.replace(/_/g, " ")}</span>
            <span className="mono text-[12px] text-primary">{String(v)}</span>
          </div>
        ))}
      </div>
    ) : <div className="text-[13px] text-muted">Loading environment info...</div>}
  </div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-medium text-secondary">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-full rounded border bg-surface px-2.5 text-[13px] text-primary focus:border-accent focus:outline-none" />
    </label>
  );
}

function InlineError() { return <div className="rounded border border-error bg-error-subtle px-3 py-2 text-[12px] text-error">Unable to load settings.</div>; }

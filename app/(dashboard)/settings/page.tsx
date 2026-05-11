// File ini merender halaman Settings bertab untuk konfigurasi gateway, admin users, dan environment. Dipakai untuk form konfigurasi internal.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Plus, Server, Trash2, X } from "lucide-react";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "@/components/ui/Toast";
import { gatewayApi, type AdminUser, type EnvironmentInfo, type Settings, type UserRole } from "@/lib/api";

type Tab = "general" | "security" | "rate-limits" | "retention" | "admin-users" | "environment";
type SettingsForm = Settings & {
  general: Settings["general"] & { support_email?: string };
  security: Settings["security"] & { jwt_secret?: string; ip_whitelist?: string };
  rate_limits: Settings["rate_limits"] & { max_connections_per_app?: number };
};

const tabs: Array<{ value: Tab; label: string }> = [
  { value: "general", label: "General" },
  { value: "security", label: "Security" },
  { value: "rate-limits", label: "Rate Limits" },
  { value: "retention", label: "Retention" },
  { value: "admin-users", label: "Admin Users" },
  { value: "environment", label: "Environment" }
];
const retentionOptions = ["1h", "6h", "24h", "7d", "30d"];

// SettingsPage membungkus konten dengan Suspense karena useSearchParams membutuhkan boundary saat prerender.
export default function SettingsPage() {
  return <Suspense fallback={<SettingsSkeleton />}><SettingsContent /></Suspense>;
}

// SettingsContent mengelola tab aktif, form settings, dirty state, dan save bar. State form dipisah dari saved untuk mendeteksi perubahan.
function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "general";
  const activeTab = tabs.some((item) => item.value === tab) ? tab : "general";
  // SWR settings mengambil konfigurasi editable. mutate dipakai setelah save agar cache cocok dengan form terbaru.
  const { data: settings, error, isLoading, mutate } = useSWR<SettingsForm>("/api/settings", () => gatewayApi.settings.get() as Promise<SettingsForm>);
  // SWR environment mengambil info read-only. Data ini tidak ikut dirty state karena tidak bisa diedit user.
  const { data: environment } = useSWR<EnvironmentInfo>("/api/settings/environment", () => gatewayApi.settings.environment());
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [saved, setSaved] = useState<SettingsForm | null>(null);

  // useEffect menyinkronkan data SWR ke form lokal saat settings pertama kali datang atau selesai revalidate.
  useEffect(() => {
    if (settings) {
      /* eslint-disable react-hooks/set-state-in-effect -- form harus terisi data SWR saat fetch selesai, bukan side-effect sembarangan */
      setForm(settings);
      setSaved(settings);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [settings]);

  const errors = useMemo(() => form ? validate(form) : {}, [form]);
  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  const canSave = dirty && Object.keys(errors).length === 0;

  // update menulis field nested berdasarkan path section.key. structuredClone menjaga update immutable agar React mendeteksi perubahan.
  function update(path: string, value: string | number) {
    setForm((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      const [section, key] = path.split(".") as [keyof SettingsForm, string];
      (next[section] as Record<string, string | number>)[key] = value;
      return next;
    });
  }

  // save mengirim PATCH settings. Async diperlukan karena save bar baru hilang setelah server menerima perubahan.
  async function save() {
    if (!form || !canSave) return;
    await gatewayApi.settings.update(form);
    setSaved(form);
    mutate(form, false);
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-5 pb-20">
      <h1 className="page-title">Settings</h1>
      <nav className="flex gap-5 border-b">
        {tabs.map((item) => <Link key={item.value} href={`/settings?tab=${item.value}`} className={activeTab === item.value ? "border-b-2 border-accent pb-3 text-sm font-medium text-primary" : "pb-3 text-sm text-muted hover:text-primary"}>{item.label}</Link>)}
      </nav>

      {isLoading ? <SettingsSkeleton /> : error || !form ? <InlineError message="Unable to load settings." /> : (
        <div className="max-w-[720px]">
          {activeTab === "general" ? <GeneralTab form={form} errors={errors} update={update} /> : null}
          {activeTab === "security" ? <SecurityTab form={form} errors={errors} update={update} /> : null}
          {activeTab === "rate-limits" ? <RateLimitsTab form={form} errors={errors} update={update} /> : null}
          {activeTab === "retention" ? <RetentionTab form={form} update={update} /> : null}
          {activeTab === "admin-users" ? <AdminUsersTab /> : null}
          {activeTab === "environment" ? <EnvironmentTab environment={environment} /> : null}
        </div>
      )}

      <SaveBar visible={dirty} canSave={canSave} onDiscard={() => setForm(saved)} onSave={save} />
    </div>
  );
}

function GeneralTab({ form, errors, update }: TabProps) {
  return <Panel title="General"><Field path="general.display_name" label="Display Name" value={form.general.display_name} error={errors["general.display_name"]} update={update} /><Field path="general.base_url" label="Base URL" value={form.general.base_url} error={errors["general.base_url"]} update={update} /><SelectField path="general.environment" label="Environment Label" value={form.general.environment} update={update} options={["production", "staging", "development"]} /><Field path="general.support_email" label="Support Email" value={form.general.support_email ?? ""} error={errors["general.support_email"]} update={update} /></Panel>;
}

function SecurityTab({ form, errors, update }: TabProps) {
  const [showSecret, setShowSecret] = useState(false);
  return <Panel title="Security">{!form.security.jwt_secret ? <WarningBox message="JWT Secret has not been set yet." /> : null}<div className="space-y-2"><label className="block space-y-2"><span className="label block">JWT Secret</span><div className="flex gap-2"><input type={showSecret ? "text" : "password"} value={form.security.jwt_secret ?? ""} onChange={(event) => update("security.jwt_secret", event.target.value)} className={inputClass(errors["security.jwt_secret"])} /><Button type="button" onClick={() => setShowSecret((value) => !value)}>{showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>{errors["security.jwt_secret"] ? <p className="text-sm text-error">{errors["security.jwt_secret"]}</p> : null}</label></div><SelectField path="security.cors_mode" label="Allowed CORS Mode" value={form.security.cors_mode} update={update} options={["strict", "permissive"]} /><Field path="security.token_expiry_minutes" label="Token Expiry (minutes)" type="number" value={form.security.token_expiry_minutes} error={errors["security.token_expiry_minutes"]} update={update} /><TextAreaField path="security.ip_whitelist" label="IP Whitelist" value={form.security.ip_whitelist ?? ""} update={update} /></Panel>;
}

function RateLimitsTab({ form, errors, update }: TabProps) {
  return <Panel title="Rate Limits"><Field path="rate_limits.reconnects_per_ip" label="Max Reconnects per IP" type="number" value={form.rate_limits.reconnects_per_ip} error={errors["rate_limits.reconnects_per_ip"]} update={update} /><Field path="rate_limits.publish_per_app_per_second" label="Max Publish per App per Second" type="number" value={form.rate_limits.publish_per_app_per_second} error={errors["rate_limits.publish_per_app_per_second"]} update={update} /><Field path="rate_limits.max_connections_per_app" label="Max Connections per App" type="number" value={form.rate_limits.max_connections_per_app ?? 0} error={errors["rate_limits.max_connections_per_app"]} update={update} /></Panel>;
}

function RetentionTab({ form, update }: Pick<TabProps, "form" | "update">) {
  return <Panel title="Retention"><InfoBox message="Longer retention increases storage usage." /><SelectField path="retention.event_log" label="Event Log Retention" value={form.retention.event_log} update={update} options={retentionOptions} /><SelectField path="retention.webhook_log" label="Webhook Log Retention" value={form.retention.webhook_log} update={update} options={retentionOptions} /><SelectField path="retention.connection_log" label="Connection Log Retention" value={form.retention.connection_log} update={update} options={retentionOptions} /></Panel>;
}

// AdminUsersTab mengelola tabel user admin dan invite/delete flow. Data user dipisahkan dari form settings karena endpoint berbeda.
function AdminUsersTab() {
  const { data, error, isLoading, mutate } = useSWR<AdminUser[]>("/api/admin/users", () => gatewayApi.adminUsers.list());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const columns = useMemo<DataTableColumn<AdminUser>[]>(() => [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <StatusBadge variant={row.original.role === "viewer" ? "neutral" : "info"}>{row.original.role}</StatusBadge> },
    { id: "last_login", header: "Last Login", cell: () => <span className="text-muted">—</span> },
    { id: "actions", header: "Actions", cell: ({ row }) => <Button variant="ghost" className="h-8 w-8 px-0 text-error" onClick={() => setDeleteUser(row.original)}><Trash2 className="h-4 w-4" /></Button> }
  ], []);
  return <Panel title="Admin Users" action={<Button variant="default" onClick={() => setInviteOpen(true)}><Plus className="mr-2 h-4 w-4" />Invite Admin</Button>}>{isLoading ? <TableSkeleton /> : error ? <InlineError message="Unable to load admin users." /> : data?.length ? <DataTable columns={columns} data={data} /> : <EmptyState icon={Server} title="No admin users" description="Invite an admin user to manage the gateway." />}<InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onInvite={(user) => { mutate([...(data ?? []), user], false); toast.success("Invite sent"); }} /><ConfirmDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)} title="Remove admin user" description="This user will no longer have access to the dashboard." confirmLabel="Remove" onConfirm={async () => { if (!deleteUser) return; await gatewayApi.adminUsers.delete(deleteUser.id); mutate((data ?? []).filter((user) => user.id !== deleteUser.id), false); setDeleteUser(null); toast.success("User removed"); }} /></Panel>;
}

function EnvironmentTab({ environment }: { environment?: EnvironmentInfo }) {
  if (!environment) return <SettingsSkeleton />;
  return <Panel title="Environment"><ReadOnly label="Gateway version" value={environment.gateway_version} /><ReadOnly label="Go version" value={environment.go_version} /><ReadOnly label="Redis version" value={`${environment.redis_version} · ${environment.redis_status}`} /><ReadOnly label="Uptime" value={formatUptime(environment.uptime_seconds)} /><ReadOnly label="Build commit" value={environment.build_commit} mono /></Panel>;
}

function InviteDialog({ open, onOpenChange, onInvite }: { open: boolean; onOpenChange: (open: boolean) => void; onInvite: (user: AdminUser) => void }) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const email = String(form.get("email") ?? ""); const role = String(form.get("role") ?? "admin") as UserRole; if (!email.includes("@")) { setError("Enter a valid email."); return; } const user = await gatewayApi.adminUsers.invite({ email, role }); onInvite(user); onOpenChange(false); }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md border bg-surface1 p-5 shadow-none focus:outline-none"><div className="flex items-center justify-between"><Dialog.Title className="text-base font-semibold">Invite Admin</Dialog.Title><Dialog.Close asChild><Button variant="ghost" className="h-8 w-8 px-0"><X className="h-4 w-4" /></Button></Dialog.Close></div><form className="mt-5 space-y-4" onSubmit={submit}><Input name="email" label="Email" required /><label className="block space-y-2"><span className="label block">Role</span><select name="role" className={selectClass}><option value="admin">admin</option><option value="viewer">viewer</option></select></label>{error ? <p className="text-sm text-error">{error}</p> : null}<Button type="submit" variant="default" className="w-full">Invite Admin</Button></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

type TabProps = { form: SettingsForm; errors: Record<string, string>; update: (path: string, value: string | number) => void };
function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-md border bg-surface2 p-4"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="section-title">{title}</h2>{action}</div><div className="space-y-4">{children}</div></section>; }
function Field({ path, label, value, error, update, type = "text" }: { path: string; label: string; value: string | number; error?: string; update: (path: string, value: string | number) => void; type?: string }) { return <label className="block space-y-2"><span className="label block">{label}</span><input type={type} value={value} onChange={(event) => update(path, type === "number" ? Number(event.target.value) : event.target.value)} className={inputClass(error)} />{error ? <p className="text-sm text-error">{error}</p> : null}</label>; }
function SelectField({ path, label, value, update, options }: { path: string; label: string; value: string; update: (path: string, value: string) => void; options: string[] }) { return <label className="block space-y-2"><span className="label block">{label}</span><select value={value} onChange={(event) => update(path, event.target.value)} className={selectClass}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function TextAreaField({ path, label, value, update }: { path: string; label: string; value: string; update: (path: string, value: string) => void }) { return <label className="block space-y-2"><span className="label block">{label}</span><textarea value={value} onChange={(event) => update(path, event.target.value)} rows={5} className="focus-ring w-full rounded-sm border bg-surface1 px-3 py-2 text-sm text-primary" /></label>; }
function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) { return <div className="grid grid-cols-[180px_1fr] rounded-sm bg-surface3 px-3 py-2"><div className="label normal-case tracking-normal">{label}</div><div className={mono ? "mono text-sm text-primary" : "text-sm text-primary"}>{value}</div></div>; }
// SaveBar muncul hanya saat dirty. canSave mencegah submit jika validasi inline masih memiliki error.
function SaveBar({ visible, canSave, onDiscard, onSave }: { visible: boolean; canSave: boolean; onDiscard: () => void; onSave: () => void }) { return <div className={visible ? "fixed bottom-0 left-[248px] right-0 z-40 translate-y-0 border-t bg-surface1 px-6 py-3 transition-transform" : "fixed bottom-0 left-[248px] right-0 z-40 translate-y-full border-t bg-surface1 px-6 py-3 transition-transform"}><div className="flex items-center justify-between"><span className="text-sm text-muted">Unsaved changes will be lost on navigate.</span><div className="flex gap-2"><Button variant="ghost" onClick={onDiscard}>Discard</Button><Button variant="default" disabled={!canSave} onClick={onSave}>Save Changes</Button></div></div></div>; }
function WarningBox({ message }: { message: string }) { return <div className="rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-warning">{message}</div>; }
function InfoBox({ message }: { message: string }) { return <div className="rounded-md border border-info bg-info/10 px-4 py-3 text-sm text-info">{message}</div>; }
function SettingsSkeleton() { return <div className="max-w-[720px] space-y-3"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>; }
function TableSkeleton() { return <div className="rounded-md border bg-surface1">{Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} columns={5} />)}</div>; }
function InlineError({ message }: { message: string }) { return <div className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-error">{message}</div>; }
function inputClass(error?: string) { return error ? "focus-ring h-9 w-full rounded-sm border border-error bg-surface1 px-3 text-sm text-primary" : "focus-ring h-9 w-full rounded-sm border bg-surface1 px-3 text-sm text-primary"; }
const selectClass = "focus-ring h-9 w-full rounded-sm border bg-surface1 px-3 text-sm text-primary";
// validate mengumpulkan error field wajib dan angka negatif. Return object dipakai untuk border merah dan disable Save Changes.
function validate(form: SettingsForm) { const errors: Record<string, string> = {}; if (!form.general.display_name.trim()) errors["general.display_name"] = "Display name is required."; try { new URL(form.general.base_url); } catch { errors["general.base_url"] = "Enter a valid URL."; } if (form.general.support_email && !form.general.support_email.includes("@")) errors["general.support_email"] = "Enter a valid email."; if (form.security.token_expiry_minutes <= 0) errors["security.token_expiry_minutes"] = "Token expiry must be greater than 0."; if (form.rate_limits.reconnects_per_ip < 0) errors["rate_limits.reconnects_per_ip"] = "Value cannot be negative."; if (form.rate_limits.publish_per_app_per_second < 0) errors["rate_limits.publish_per_app_per_second"] = "Value cannot be negative."; if ((form.rate_limits.max_connections_per_app ?? 0) < 0) errors["rate_limits.max_connections_per_app"] = "Value cannot be negative."; return errors; }
function formatUptime(seconds: number) { const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); return `${days}d ${hours}h`; }

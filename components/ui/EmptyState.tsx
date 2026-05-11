// File ini mendefinisikan empty state reusable. Dipakai saat data kosong agar user mendapat konteks dan CTA yang jelas.
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// EmptyState merender kondisi kosong dengan icon, judul, deskripsi, dan optional action. Dipakai agar tabel kosong tetap memberi arahan jelas.
export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-64 flex-col items-center justify-center rounded-md border bg-surface1 p-8 text-center", className)}>
      <Icon className="h-10 w-10 text-muted" />
      <h3 className="mt-4 text-base font-semibold text-primary">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

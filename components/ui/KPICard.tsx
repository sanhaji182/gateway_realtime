// File ini mendefinisikan kartu KPI ringkas. Dipakai untuk metrik utama seperti connection count, rate, latency, dan error rate.
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// colors memetakan nama semantik ke token design system. Warna dipakai untuk sinyal metrik, bukan dekorasi.
const colors = {
  accent: "text-accent",
  teal: "text-teal",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  info: "text-info",
  primary: "text-primary"
};

// KPICard merender metrik utama dengan label, value, delta, dan optional icon. Komponen ini tidak menyimpan state agar aman dipakai di Link/card interaktif.
export function KPICard({ label, value, delta, color = "accent", icon: Icon, className }: { label: string; value: React.ReactNode; delta?: string; color?: keyof typeof colors; icon?: LucideIcon; className?: string }) {
  return (
    <section className={cn("surface-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="label">{label}</div>
        {Icon ? <Icon className="h-4 w-4 text-muted" /> : null}
      </div>
      <div className={cn("mt-3 text-2xl font-semibold tabular-nums", colors[color])}>{value}</div>
      {delta ? <div className="mt-2 text-xs text-muted">{delta}</div> : null}
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const colors = {
  accent: "text-accent",
  teal: "text-teal",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  primary: "text-primary",
};

export function KPICard({
  label,
  value,
  subtitle,
  color = "primary",
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  color?: keyof typeof colors;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col justify-between rounded border bg-surface p-3.5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.03em] text-muted">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5 text-muted" /> : null}
      </div>
      <div className={cn("mt-1.5 text-xl font-semibold tabular-nums tracking-[-0.01em]", colors[color])}>
        {value}
      </div>
      {subtitle ? <div className="mt-0.5 text-[12px] text-muted">{subtitle}</div> : null}
    </div>
  );
}

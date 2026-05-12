import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const schemes = {
  accent: { iconBg: "bg-accent/10", iconColor: "text-accent" },
  teal: { iconBg: "bg-teal/10", iconColor: "text-teal" },
  success: { iconBg: "bg-success/10", iconColor: "text-success" },
  warning: { iconBg: "bg-warning/10", iconColor: "text-warning" },
  error: { iconBg: "bg-error/10", iconColor: "text-error" },
  primary: { iconBg: "bg-border", iconColor: "text-secondary" },
  info: { iconBg: "bg-info/10", iconColor: "text-info" },
};

export function KPICard({
  label,
  value,
  subtitle,
  color = "primary",
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  color?: keyof typeof schemes;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down"; value: string };
  className?: string;
}) {
  return (
    <div className={cn(
      "card-hover group relative flex flex-col gap-2.5 rounded-lg border bg-surface p-4 shadow-xs",
      "transition-all duration-200 hover:border-border-strong",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-md", schemes[color].iconBg)}>
              <Icon className={cn("h-4 w-4", schemes[color].iconColor)} />
            </div>
          )}
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{label}</span>
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-medium",
            trend.direction === "up" ? "text-success" : "text-error"
          )}>
            {trend.direction === "up" ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums tracking-[-0.03em] text-primary", !Icon && "mt-1")}>
        {value}
      </div>
      {subtitle && <p className="text-[12px] text-muted leading-tight">{subtitle}</p>}
    </div>
  );
}

import { cn } from "@/lib/utils";

const styles = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  error: "bg-error-subtle text-error",
  info: "bg-info-subtle text-info",
  neutral: "bg-subtle text-muted",
  teal: "bg-teal-subtle text-teal",
  accent: "bg-accent-subtle text-accent",
};

export function StatusBadge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: keyof typeof styles;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(
      "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
      styles[variant],
      className
    )}>
      {children}
    </span>
  );
}

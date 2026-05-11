// File ini mendefinisikan badge status dengan warna semantik. Dipakai untuk operational, failed, warning, active, dan state teknis lain.
import { cn } from "@/lib/utils";

// styles memetakan status ke warna semantik transparan agar status mudah discan tanpa solid fill berlebihan.
const styles = {
  success: "border-success bg-success/10 text-success",
  warning: "border-warning bg-warning/10 text-warning",
  error: "border-error bg-error/10 text-error",
  info: "border-info bg-info/10 text-info",
  neutral: "border-muted bg-surface3 text-muted"
};

// StatusBadge merender label status pendek. variant menentukan warna success, warning, error, info, atau neutral.
export function StatusBadge({ variant = "neutral", className, children }: { variant?: keyof typeof styles; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-[6px] border px-2 py-0.5 text-xs font-medium", styles[variant], className)}>{children}</span>;
}

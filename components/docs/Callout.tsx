import { AlertTriangle, Info, Lightbulb, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { icon: Info, className: "border-info bg-info/10 text-info" },
  warning: { icon: AlertTriangle, className: "border-warning bg-warning/10 text-warning" },
  danger: { icon: OctagonAlert, className: "border-error bg-error/10 text-error" },
  tip: { icon: Lightbulb, className: "border-success bg-success/10 text-success" }
};

export function Callout({ type = "info", children }: { type?: keyof typeof styles; children: React.ReactNode }) {
  const { icon: Icon, className } = styles[type];
  return <div className={cn("my-5 flex gap-3 rounded-md border p-4 text-sm", className)}><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div className="text-primary">{children}</div></div>;
}

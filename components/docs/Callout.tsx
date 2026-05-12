import { AlertTriangle, Info, Lightbulb, OctagonAlert } from "lucide-react";

const styles = {
  info: {
    icon: Info,
    container: "border-blue-200/60 bg-blue-50/60 text-blue-800",
    iconColor: "text-blue-500",
    darkBorder: "dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-200",
    darkIcon: "dark:text-blue-400"
  },
  warning: {
    icon: AlertTriangle,
    container: "border-amber-200/60 bg-amber-50/60 text-amber-800",
    iconColor: "text-amber-500",
    darkBorder: "dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200",
    darkIcon: "dark:text-amber-400"
  },
  danger: {
    icon: OctagonAlert,
    container: "border-red-200/60 bg-red-50/60 text-red-800",
    iconColor: "text-red-500",
    darkBorder: "dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-200",
    darkIcon: "dark:text-red-400"
  },
  tip: {
    icon: Lightbulb,
    container: "border-emerald-200/60 bg-emerald-50/60 text-emerald-800",
    iconColor: "text-emerald-500",
    darkBorder: "dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-200",
    darkIcon: "dark:text-emerald-400"
  },
};

export function Callout({ type = "info", children }: { type?: keyof typeof styles; children: React.ReactNode }) {
  const s = styles[type];
  return (
    <div className={`my-6 flex gap-3 rounded-xl border p-4 text-[13px] leading-relaxed ${s.container} ${s.darkBorder}`}>
      <s.icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.iconColor} ${s.darkIcon}`} />
      <div>{children}</div>
    </div>
  );
}

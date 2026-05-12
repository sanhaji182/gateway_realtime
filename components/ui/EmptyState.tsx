import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-surface shadow-xs">
        <Icon className="h-6 w-6 text-muted" />
      </div>
      <h3 className="text-[14px] font-semibold text-primary">{title}</h3>
      <p className="mt-1 max-w-[300px] text-[12px] text-muted leading-relaxed">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

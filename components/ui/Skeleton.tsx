import { cn } from "@/lib/utils";

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-sm bg-subtle", className)} style={style} />;
}

export function SkeletonRow({ columns = 4 }: { columns?: number; cols?: number; widths?: string[] }) {
  return (
    <div className="flex h-9 items-center gap-3 border-b px-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return <Skeleton className="h-24 w-full rounded border" />;
}

export function SkeletonChart() {
  return <Skeleton className="h-56 w-full rounded border" />;
}

export function SkeletonBlock({ height = 80 }: { height?: number }) {
  return <Skeleton className="w-full rounded border" style={{ height }} />;
}

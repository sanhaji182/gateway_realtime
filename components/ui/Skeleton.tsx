// File ini mendefinisikan skeleton loading reusable. Dipakai untuk menjaga layout tetap stabil saat data sedang dimuat.
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn("animate-pulse rounded-sm bg-surface3", className)} style={style} />;
}

export // Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function SkeletonRow({ columns, cols, widths = [] }: { columns?: number; cols?: number; widths?: string[] }) {
  const columnCount = columns ?? cols ?? 4;
  return (
    <div className="grid h-10 items-center gap-4 border-b px-4" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
      {Array.from({ length: columnCount }).map((_, index) => (
        <Skeleton key={index} className="h-3" style={{ width: widths[index] }} />
      ))}
    </div>
  );
}

export // Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function SkeletonCard() {
  return <Skeleton className="h-28 w-full rounded-md" />;
}

export // Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function SkeletonChart() {
  return <Skeleton className="h-72 w-full rounded-md" />;
}

export // Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function SkeletonInput() {
  return <Skeleton className="h-9 w-full rounded-sm" />;
}

export // Skeleton adalah primitive loading dengan animate-pulse dan warna surface3 sesuai design system.
function SkeletonBlock({ height = 80 }: { height?: number }) {
  return <Skeleton className="w-full rounded-md" style={{ height }} />;
}

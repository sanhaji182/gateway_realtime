import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function FilterBar({
  searchValue,
  onSearchChange,
  filters,
  hasActiveFilters,
  onReset,
  className,
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;
  dateRange?: React.ReactNode;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("sticky top-12 z-10 -mx-5 flex items-center gap-2 border-b bg-base/90 backdrop-blur-sm px-5 py-2", className)}>
      <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search"
          className="h-8 w-full rounded border bg-surface pl-8 pr-3 text-[13px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </label>
      {filters}
      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1 h-3 w-3" />Reset
        </Button>
      ) : null}
    </div>
  );
}

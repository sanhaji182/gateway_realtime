// File ini mendefinisikan bar filter sticky di bawah topbar. Dipakai pada halaman tabel untuk search, filter, date/range, dan reset.
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// FilterBar merender search dan slot filter yang sticky. hasActiveFilters menentukan apakah tombol reset perlu muncul agar UI tetap ringkas.
export function FilterBar({ searchValue, onSearchChange, filters, dateRange, hasActiveFilters, onReset, className }: { searchValue?: string; onSearchChange?: (value: string) => void; filters?: React.ReactNode; dateRange?: React.ReactNode; hasActiveFilters?: boolean; onReset?: () => void; className?: string }) {
  return (
    <div className={cn("sticky top-16 z-20 flex items-center gap-2 border-b bg-canvas py-3", className)}>
      <label className="relative min-w-[260px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={searchValue ?? ""}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Search"
          className={cn("focus-ring h-9 w-full rounded-sm border bg-surface1 pl-9 pr-3 text-sm text-primary placeholder:text-muted", searchValue && "border-accent")}
        />
      </label>
      {filters}
      {dateRange}
      {hasActiveFilters ? (
        <Button type="button" variant="ghost" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      ) : null}
    </div>
  );
}

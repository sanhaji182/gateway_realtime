"use client";

import { ChevronDown, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTimeRange } from "@/context/TimeRangeContext";
import { useAuth } from "@/hooks/useAuth";
import type { TimeRange } from "@/lib/api";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/": "Overview",
  "/overview": "Overview",
  "/apps": "Apps",
  "/connections": "Connections",
  "/events": "Events",
  "/webhooks": "Webhooks",
  "/settings": "Settings"
};

const observabilityRoutes = new Set(["/", "/overview", "/events", "/webhooks", "/connections"]);
const ranges: TimeRange[] = ["30m", "1h", "24h"];

function TimeRangeSelector() {
  const { range, setRange } = useTimeRange();

  return (
    <label className="relative inline-flex h-9 items-center rounded-sm border bg-surface2 px-3 text-sm text-secondary hover:text-primary">
      <select value={range} onChange={(event) => setRange(event.target.value as TimeRange)} className="appearance-none bg-transparent pr-6 outline-none">
        {ranges.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-muted" />
    </label>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <button type="button" onClick={logout} className="focus-ring inline-flex h-9 items-center gap-2 rounded-sm border bg-surface2 px-3 text-sm text-secondary hover:text-primary" title="Sign out">
      {user?.name ?? "Operator"}
      <ChevronDown className="h-4 w-4 text-muted" />
    </button>
  );
}

export function TopBar({ className, onMenuClick }: { className?: string; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-surface1 px-4 md:px-6", className)}>
      <div className="flex items-center gap-3"><button type="button" className="focus-ring rounded-sm border bg-surface2 p-2 text-muted hover:text-primary md:hidden" onClick={onMenuClick} aria-label="Open sidebar"><Menu className="h-4 w-4" /></button><div className="page-title">{title}</div></div>
      <div className="flex shrink-0 items-center gap-2">
        {observabilityRoutes.has(pathname) ? <TimeRangeSelector /> : null}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

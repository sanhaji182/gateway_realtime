"use client";

import { ChevronDown, Menu, SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const titles: Record<string, string> = {
  "/": "Overview",
  "/overview": "Overview",
  "/apps": "Apps",
  "/connections": "Connections",
  "/events": "Events",
  "/webhooks": "Webhooks",
  "/settings": "Settings",
};

export function TopBar({ onMenuClick }: { className?: string; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b bg-surface/80 backdrop-blur-sm px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded p-1.5 text-muted hover:bg-hover hover:text-secondary md:hidden"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="page-title">{title}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded border bg-surface px-2.5 text-[12px] text-secondary hover:bg-hover hover:text-primary"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
          Last 30 days
          <ChevronDown className="h-3 w-3 text-muted" />
        </button>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  return (
    <button
      type="button"
      onClick={logout}
      className="flex h-7 items-center gap-1.5 rounded border bg-surface px-2.5 text-[12px] text-secondary hover:bg-hover hover:text-primary"
      title="Sign out"
    >
      {user?.name ?? "Operator"}
      <ChevronDown className="h-3 w-3 text-muted" />
    </button>
  );
}

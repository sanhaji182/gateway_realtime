"use client";

import { ChevronDown, Menu, SlidersHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

const titles: Record<string, string> = {
  "/": "Overview",
  "/overview": "Overview",
  "/apps": "Apps",
  "/connections": "Connections",
  "/events": "Events",
  "/webhooks": "Webhooks",
  "/settings": "Settings",
};

export function TopBar({ className, onMenuClick }: { className?: string; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/50 bg-surface/70 backdrop-blur-lg px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-hover hover:text-secondary md:hidden transition-colors"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
        <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-primary">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-lg border bg-surface px-3 text-[12px] text-secondary hover:bg-hover hover:text-primary transition-colors shadow-xs"
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
      className="flex h-8 items-center gap-1.5 rounded-lg border bg-surface px-3 text-[12px] font-medium text-secondary hover:bg-hover hover:text-primary transition-colors shadow-xs"
      title="Sign out"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
        {user?.name?.[0] || "U"}
      </span>
      {user?.name || "User"}
      <ChevronDown className="h-3 w-3 text-muted" />
    </button>
  );
}

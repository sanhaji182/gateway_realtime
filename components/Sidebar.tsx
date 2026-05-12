"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, Bell, Boxes, Radio, Settings, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; icon: LucideIcon; label: string; shortcut?: string }[] = [
  { href: "/overview", icon: BarChart3, label: "Overview", shortcut: "⌘1" },
  { href: "/apps", icon: Boxes, label: "Apps", shortcut: "⌘2" },
  { href: "/connections", icon: Radio, label: "Connections" },
  { href: "/events", icon: Zap, label: "Events" },
  { href: "/webhooks", icon: ArrowLeftRight, label: "Webhooks" },
  { href: "/playground", icon: Zap, label: "Playground", shortcut: "⌘3" },
  { href: "/settings", icon: Settings, label: "Settings", shortcut: "⌘," },
];

function NavItem({ href, icon: Icon, label, shortcut, onNavigate }: { href: string; icon: LucideIcon; label: string; shortcut?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href === "/overview" && pathname === "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-accent/8 text-accent"
          : "text-secondary hover:bg-hover hover:text-primary"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-accent" : "text-muted group-hover:text-secondary")} />
      <span className="flex-1">{label}</span>
      {shortcut ? (
        <span className={cn("text-[10px] font-medium rounded px-1.5 py-0.5", active ? "bg-accent/15 text-accent" : "bg-subtle text-muted")}>
          {shortcut}
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] md:hidden transition-opacity", mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={onMobileClose} />
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-w)] flex-col border-r bg-surface/80 backdrop-blur-xl transition-transform duration-300 ease-out md:z-30 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-14 items-center gap-2.5 border-b px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent shadow-sm shadow-accent-glow">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-primary">Gateway</span>
          </div>
          <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">v0.3</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavItem key={item.href} {...item} onNavigate={onMobileClose} />
          ))}
        </nav>

        <div className="border-t px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-[11px] font-medium text-secondary">All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}

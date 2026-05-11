"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, Boxes, Radio, Search, Settings, Store, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; icon: LucideIcon; label: string; shortcut?: string }[] = [
  { href: "/overview", icon: BarChart3, label: "Overview", shortcut: "⌘1" },
  { href: "/apps", icon: Store, label: "Products", shortcut: "⌘2" },
  { href: "/connections", icon: Radio, label: "Marketplaces" },
  { href: "/events", icon: Zap, label: "Intelligence" },
  { href: "/webhooks", icon: ArrowLeftRight, label: "Price Compare" },
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
        "group flex h-8 items-center gap-2.5 rounded px-2.5 text-[13px] transition-colors",
        active
          ? "bg-accent-subtle text-accent font-medium"
          : "text-secondary hover:bg-hover hover:text-primary"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted group-hover:text-secondary")} />
      <span className="flex-1 truncate">{label}</span>
      {shortcut ? <span className="text-[10px] text-muted">{shortcut}</span> : null}
    </Link>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/20 md:hidden", mobileOpen ? "block" : "hidden")} onClick={onMobileClose} />
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-w)] flex-col border-r bg-surface transition-transform md:z-30 md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-12 items-center gap-2.5 border-b px-4">
          <Search className="h-4 w-4 text-muted" />
          <span className="text-[13px] font-semibold text-primary">Marketlytics</span>
          <span className="ml-auto rounded bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-muted">BETA</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {items.map((item) => (
            <NavItem key={item.href} {...item} onNavigate={onMobileClose} />
          ))}
        </nav>
        <div className="border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_0_2px_var(--success-subtle)]" />
            <span className="text-[12px] text-secondary">All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  );
}

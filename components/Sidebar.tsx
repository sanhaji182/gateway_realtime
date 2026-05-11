"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Radio, Settings, Webhook, X, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/overview", icon: LayoutDashboard, label: "Overview" },
  { href: "/apps", icon: Boxes, label: "Apps" },
  { href: "/connections", icon: Radio, label: "Connections" },
  { href: "/events", icon: Zap, label: "Events" },
  { href: "/webhooks", icon: Webhook, label: "Webhooks" },
  { href: "/settings", icon: Settings, label: "Settings" }
];

function NavItem({ href, icon: Icon, label, onNavigate }: { href: string; icon: LucideIcon; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || (href === "/overview" && pathname === "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("focus-ring flex h-9 items-center gap-2 rounded-sm px-3 text-sm transition-colors", active ? "bg-surface3 text-primary" : "text-muted hover:bg-surface2 hover:text-secondary")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/50 md:hidden", mobileOpen ? "block" : "hidden")} onClick={onMobileClose} />
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r bg-surface1 transition-transform md:z-40 md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")}>
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div>
            <div className="text-sm font-semibold text-primary">Event Gateway</div>
            <div className="mt-0.5 text-xs text-muted">Realtime dashboard</div>
          </div>
          <button type="button" className="focus-ring rounded-sm p-1 text-muted hover:text-primary md:hidden" onClick={onMobileClose} aria-label="Close sidebar"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => <NavItem key={item.href} {...item} onNavigate={onMobileClose} />)}
        </nav>
        <div className="border-t p-4">
          <div className="label mb-2">System Status</div>
          <div className="flex items-center gap-2 text-sm text-secondary"><span className="h-2 w-2 rounded-full bg-success" aria-hidden /><span>Operational</span></div>
        </div>
      </aside>
    </>
  );
}

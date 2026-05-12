"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:pl-[var(--sidebar-w)]">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="page-enter flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}

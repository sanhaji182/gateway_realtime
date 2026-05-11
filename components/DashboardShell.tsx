"use client";

import { useState } from "react";
import { AlertBanner } from "@/components/AlertBanner";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:pl-[248px]">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <AlertBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

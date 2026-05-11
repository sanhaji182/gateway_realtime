"use client";

import { X } from "lucide-react";
import { useSystemAlert } from "@/hooks/useSystemAlert";
import { cn } from "@/lib/utils";

export function AlertBanner() {
  const { alerts, dismiss } = useSystemAlert();

  if (!alerts.length) return null;

  return (
    <div className="border-b bg-surface1">
      {alerts.map((alert) => (
        <div key={alert.id} className={cn("flex items-center justify-between gap-3 border-b px-6 py-2 text-sm last:border-b-0", alert.severity === "error" ? "border-error bg-error/10 text-error" : "border-warning bg-warning/10 text-warning")}>
          <span>{alert.message}</span>
          <button type="button" className="focus-ring rounded-sm p-1" aria-label="Dismiss alert" onClick={() => dismiss(alert.id)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSystemAlert } from "@/hooks/useSystemAlert";
import { cn } from "@/lib/utils";

export function AlertBanner() {
  const { alerts } = useSystemAlert();
  const latestId = alerts[0]?.id;
  const [dismissed, setDismissed] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDismissed(false), [latestId]);

  if (!alerts.length || dismissed) return null;

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 border-b px-5 py-1.5 text-[12px]",
      alerts[0].severity === "error" ? "bg-error-subtle text-error" : "bg-warning-subtle text-warning"
    )}>
      <span>{alerts[0].message}</span>
      <button
        type="button"
        className="text-inherit opacity-60 hover:opacity-100"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}

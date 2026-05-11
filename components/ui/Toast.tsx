"use client";

import { Toaster as Sonner, toast as sonnerToast } from "sonner";

export { sonnerToast as toast };

export function Toast() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          fontSize: "13px",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-sm)",
        },
      }}
    />
  );
}

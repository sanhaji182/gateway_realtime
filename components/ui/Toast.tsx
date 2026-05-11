// File ini membungkus sistem toast global. Dipakai untuk feedback aksi penting seperti save, retry, copy, dan disconnect.
"use client";

import { Toaster, toast } from "sonner";

// toast diekspor agar halaman bisa memicu feedback aksi tanpa mengimpor langsung dari sonner.
export { toast };

// Toast memasang Toaster global di bottom-right. Durasi 4000ms memberi waktu baca tanpa memenuhi layar operator.
export function Toast() {
  return (
    <Toaster
      position="bottom-right"
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "!rounded-md !border !border-border !bg-surface1 !text-primary !shadow-none",
          description: "!text-secondary",
          success: "!border-success",
          error: "!border-error",
          warning: "!border-warning",
          info: "!border-info"
        }
      }}
    />
  );
}

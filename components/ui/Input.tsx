// File ini mendefinisikan input form berlabel yang konsisten. Dipakai oleh login, modal, drawer, dan halaman Settings.
import * as React from "react";
import { cn } from "@/lib/utils";

// InputProps menambahkan label agar field form punya struktur aksesibilitas yang sama di semua modal dan halaman.
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// Input merender label dan input sebagai satu unit. Ref diteruskan agar kompatibel dengan form library atau fokus manual di masa depan.
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, id, ...props }, ref) => {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2">
      {label ? <span className="label block">{label}</span> : null}
      <input
        id={inputId}
        ref={ref}
        className={cn("focus-ring h-9 w-full rounded-sm border bg-surface2 px-3 text-sm text-primary placeholder:text-muted disabled:opacity-50", className)}
        {...props}
      />
    </label>
  );
});
Input.displayName = "Input";

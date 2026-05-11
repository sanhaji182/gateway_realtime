// File ini mendefinisikan Button dasar yang dipakai di seluruh dashboard. Komponen ini menjaga varian aksi, loading state, dan gaya tombol tetap konsisten.
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// buttonVariants memusatkan variasi tombol agar warna aksi default, secondary, ghost, dan destructive konsisten di semua halaman.
const buttonVariants = cva(
  "focus-ring inline-flex h-9 items-center justify-center rounded-sm border px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent text-white hover:opacity-90 dark:text-[#06111d]",
        secondary: "bg-surface2 text-secondary hover:text-primary",
        ghost: "border-transparent bg-transparent text-muted hover:bg-surface2 hover:text-primary",
        destructive: "border-error bg-error text-white hover:opacity-90"
      }
    },
    defaultVariants: { variant: "secondary" }
  }
);

// ButtonProps menambahkan asChild untuk komposisi Radix Slot dan loading untuk mencegah submit ganda saat request async berjalan.
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

// Button merender tombol reusable. Props loading akan men-disable tombol dan menampilkan spinner tanpa mengubah handler pemanggil.
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, asChild = false, loading = false, disabled, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant }), className)} ref={ref} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Comp>
  );
});
Button.displayName = "Button";

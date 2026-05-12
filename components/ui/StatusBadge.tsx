import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-success/8 text-success ring-1 ring-inset ring-success/15",
        error: "bg-error/8 text-error ring-1 ring-inset ring-error/15",
        warning: "bg-warning/8 text-warning ring-1 ring-inset ring-warning/15",
        accent: "bg-accent/8 text-accent ring-1 ring-inset ring-accent/15",
        neutral: "bg-subtle text-muted ring-1 ring-inset ring-border",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function StatusBadge({ variant, className, children, ...props }: VariantProps<typeof badgeVariants> & { children?: React.ReactNode; className?: string }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props}>{children}</span>;
}

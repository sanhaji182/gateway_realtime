"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "h-9 bg-accent text-inverse px-4 shadow-xs hover:bg-accent-hover hover:shadow-sm",
        secondary: "h-9 border bg-surface text-secondary px-4 shadow-xs hover:bg-hover hover:text-primary hover:border-border-strong",
        ghost: "h-9 bg-transparent text-secondary px-3 hover:bg-hover hover:text-primary",
        danger: "h-9 border border-error/20 bg-error-subtle text-error px-4 hover:bg-error hover:text-white hover:border-error",
      },
      size: {
        sm: "h-8 text-[12px] px-3 rounded-md",
        md: "h-9 text-[13px] px-4 rounded-md",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} disabled={disabled || loading} {...props}>
        {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

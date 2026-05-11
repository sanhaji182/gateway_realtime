"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "h-8 bg-accent text-inverse px-3 hover:bg-accent-hover",
        secondary: "h-8 border bg-surface text-secondary px-3 hover:bg-hover hover:text-primary shadow-sm",
        ghost: "h-8 bg-transparent text-secondary px-2 hover:bg-hover hover:text-primary",
        danger: "h-8 border border-error bg-error-subtle text-error px-3 hover:bg-error hover:text-inverse",
      },
      size: {
        sm: "h-7 text-[12px] px-2.5",
        md: "h-8 text-[13px] px-3",
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

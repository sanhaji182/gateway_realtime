"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <label className="block space-y-1.5">
        {label ? <span className="text-[12px] font-medium text-secondary">{label}</span> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-8 w-full rounded border bg-surface px-2.5 text-[13px] text-primary placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50",
            className
          )}
          {...props}
        />
      </label>
    );
  }
);
Input.displayName = "Input";

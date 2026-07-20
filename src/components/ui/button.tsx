"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium",
    "rounded-md transition-colors duration-(--motion-fast) cursor-pointer select-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand text-ink-on-brand hover:bg-brand-hover",
        secondary:
          "bg-surface-raised text-ink border border-line hover:border-line-strong hover:bg-surface-sunken/60",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-sunken",
        danger: "bg-danger text-ink-on-brand hover:opacity-90",
        subtle: "bg-brand-subtle text-brand-subtle-ink hover:bg-brand-100",
      },
      size: {
        sm: "h-11 px-3 text-sm sm:h-8 sm:px-2.5 sm:text-xs",
        md: "h-11 px-4 text-sm sm:h-9",
        lg: "h-12 px-5 text-base sm:h-10 sm:text-sm",
        icon: "h-11 w-11 sm:h-9 sm:w-9",
        iconSm: "h-11 w-11 sm:h-8 sm:w-8",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };

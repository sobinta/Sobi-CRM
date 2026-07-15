import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status Chip — SOBI CRM's status grammar. Every record status across the
 * product renders as a chip: a tone-tinted dot + label. One consistent visual
 * language for state, everywhere.
 */
const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-ink-muted",
        brand: "bg-brand-subtle text-brand-subtle-ink",
        accent: "bg-accent-subtle text-accent-subtle-ink",
        positive: "bg-positive-subtle text-positive-subtle-ink",
        warning: "bg-warning-subtle text-warning-subtle-ink",
        danger: "bg-danger-subtle text-danger-subtle-ink",
        info: "bg-info-subtle text-info-subtle-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dotTone: Record<string, string> = {
  neutral: "bg-ink-faint",
  brand: "bg-brand",
  accent: "bg-accent",
  positive: "bg-positive",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {
  /** Show the leading status dot (default true). */
  dot?: boolean;
}

export function Chip({
  className,
  tone = "neutral",
  dot = true,
  children,
  ...props
}: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", dotTone[tone ?? "neutral"])}
        />
      )}
      {children}
    </span>
  );
}

export { chipVariants };

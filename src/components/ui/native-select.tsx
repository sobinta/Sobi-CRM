import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight native select styled to match the design system. */
export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-9.5 w-full appearance-none rounded-md border border-line bg-surface-raised ps-3 pe-9 text-sm text-ink",
        "transition-colors duration-(--motion-fast) hover:border-line-strong",
        "focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
  </div>
));
NativeSelect.displayName = "NativeSelect";

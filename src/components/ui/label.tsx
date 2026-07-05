import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "mb-1.5 block text-sm font-medium text-ink",
      className,
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="ms-0.5 text-danger" aria-hidden>
        *
      </span>
    )}
  </label>
));
Label.displayName = "Label";

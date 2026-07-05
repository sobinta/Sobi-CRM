import { cn } from "@/lib/utils";

/** Inline field error, announced to assistive tech. */
export function FieldError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn("mt-1.5 text-xs text-danger", className)}
    >
      {children}
    </p>
  );
}

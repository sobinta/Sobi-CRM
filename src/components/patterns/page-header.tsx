import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky page header: title, optional description, and a primary-action slot.
 * The consistent top of every workspace page.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FeatureHelp } from "./feature-help";

/**
 * Sticky page header: title, optional description, and a primary-action slot.
 * The consistent top of every workspace page.
 *
 * `helpTopic` renders a small "?" button next to the title that opens the
 * matching `helpTopics.<key>` entry — every section gets one so a user can
 * always learn how the feature they're in works, in the active locale.
 */
export function PageHeader({
  title,
  description,
  actions,
  helpTopic,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  helpTopic?: string;
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
      <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-start gap-1">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-ink sm:text-lg">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 truncate text-xs text-ink-muted sm:text-sm">
                {description}
              </p>
            )}
          </div>
          {helpTopic && (
            <div className="mt-0.5 shrink-0">
              <FeatureHelp topicKey={helpTopic} />
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

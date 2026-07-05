import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "brand" | "positive" | "warning" | "danger" | "info" | "neutral";
}

const toneClass: Record<string, string> = {
  brand: "text-brand",
  positive: "text-positive",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink",
};

/** A responsive row of KPI stat cards — reused across module dashboards. */
export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-surface-raised p-4 shadow-raised"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {s.label}
              </p>
              {Icon && <Icon className="h-4 w-4 text-ink-faint" />}
            </div>
            <p
              className={cn(
                "mt-2 tabular text-2xl font-semibold",
                toneClass[s.tone ?? "neutral"],
              )}
            >
              {s.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

import {
  Phone,
  Mail,
  Calendar,
  StickyNote,
  ArrowRightLeft,
  CheckSquare,
  FileText,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TimelineItem } from "@/engines/timeline/timeline";
import { EmptyState } from "./empty-state";

const kindIcon: Record<string, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  stage_change: ArrowRightLeft,
  task: CheckSquare,
  file: FileText,
  system: Sparkles,
};

/** Universal Timeline renderer — one chronological history for any record. */
export function TimelinePanel({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={StickyNote}
        title="Nothing here yet"
        description="Activity, notes, and changes will appear on this timeline."
      />
    );
  }

  return (
    <ol className="relative space-y-4 ps-6">
      {/* rail */}
      <span
        aria-hidden
        className="absolute inset-y-1 start-[9px] w-px bg-line"
      />
      {items.map((item) => {
        const Icon = kindIcon[item.kind] ?? Sparkles;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -start-6 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted">
              <Icon className="h-3 w-3" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{item.title}</p>
              {item.body && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">
                  {item.body}
                </p>
              )}
              <time className="mt-0.5 block text-xs text-ink-faint tabular">
                {new Date(item.occurredAt).toLocaleString()}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

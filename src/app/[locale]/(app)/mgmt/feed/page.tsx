import { notFound } from "next/navigation";
import {
  UserPlus,
  Handshake,
  CheckSquare,
  FileUp,
  Calendar,
  Zap,
  Activity as ActivityIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getFeed } from "@/engines/feed/feed-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";

const iconFor: Record<string, LucideIcon> = {
  contact: UserPlus,
  company: UserPlus,
  lead: UserPlus,
  deal: Handshake,
  task: CheckSquare,
  file: FileUp,
  appointment: Calendar,
  automation: Zap,
  module: Zap,
};

function iconForType(type: string): LucideIcon {
  const prefix = type.split(".")[0];
  return iconFor[prefix] ?? ActivityIcon;
}

export default async function FeedPage() {
  const data = await withPlatformContext(() => getFeed({ take: 60 }));
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="Activity feed"
        description="Everything happening across your workspace."
      />
      <div className="mx-auto max-w-2xl px-6 py-6">
        {data.items.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity yet"
            description="As your team works, events will stream here."
          />
        ) : (
          <ol className="relative space-y-4 ps-7">
            <span
              aria-hidden
              className="absolute inset-y-1 start-[11px] w-px bg-line"
            />
            {data.items.map((item) => {
              const Icon = iconForType(item.type);
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -start-7 top-0 flex h-[23px] w-[23px] items-center justify-center rounded-full border border-line bg-surface-raised text-ink-muted">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-ink">
                      <span className="text-ink-muted">Someone</span>{" "}
                      {item.label}
                    </p>
                    <time className="shrink-0 tabular text-xs text-ink-faint">
                      {new Date(item.occurredAt).toLocaleString()}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

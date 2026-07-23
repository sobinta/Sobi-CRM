"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/patterns/empty-state";
import { approveActionAction, rejectActionAction } from "./actions";

export interface PendingAction {
  id: string;
  skill: string;
  summary: string;
  entityType: string | null;
  createdAt: string;
}

export function ActionCenter({ actions }: { actions: PendingAction[] }) {
  const t = useTranslations("aiWorkspace");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(id: string, approve: boolean) {
    startTransition(async () => {
      if (approve) await approveActionAction(id);
      else await rejectActionAction(id);
      router.refresh();
    });
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t("noPendingTitle")}
        description={t("noPendingBody")}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {actions.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-4 rounded-xl border border-line bg-surface-raised p-4"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-subtle text-accent-subtle-ink">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{a.summary}</p>
            <div className="mt-1 flex items-center gap-2">
              <Chip tone="accent" dot={false}>
                {a.skill.replace(/_/g, " ")}
              </Chip>
              <span className="text-xs text-ink-faint">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => decide(a.id, false)}
              disabled={pending}
            >
              <X className="h-4 w-4" /> {t("reject")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => decide(a.id, true)}
              disabled={pending}
            >
              <Check className="h-4 w-4" /> {t("approve")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

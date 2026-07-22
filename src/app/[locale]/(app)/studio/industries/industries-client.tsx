"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import {
  Dumbbell,
  Stethoscope,
  Briefcase,
  Shapes,
  Check,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
import { applyIndustryAction } from "./actions";

export interface IndustryRow {
  key: string;
  name: string;
  description: string;
  icon: string;
  entityCount: number;
  applied: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  Dumbbell,
  Stethoscope,
  Briefcase,
};

export function IndustriesClient({ industries }: { industries: IndustryRow[] }) {
  const t = useTranslations("industries");
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function apply(key: string) {
    setPendingKey(key);
    startTransition(async () => {
      await applyIndustryAction({ key });
      setPendingKey(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 px-6 py-6 sm:grid-cols-2">
      {industries.map((ind) => {
        const Icon = ICONS[ind.icon] ?? Shapes;
        const busy = pendingKey === ind.key;
        return (
          <Card key={ind.key}>
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{ind.name}</h3>
                    {ind.applied && (
                      <Chip tone="positive" dot={false}>
                        <Check className="h-3 w-3" /> {t("applied")}
                      </Chip>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{ind.description}</p>
                </div>
              </div>
              <p className="text-xs text-ink-faint">
                {t("entities", { count: ind.entityCount })}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-1">
                {ind.applied ? (
                  <Link
                    href="/studio/entities"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    {t("view")} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => apply(ind.key)}
                    disabled={busy}
                  >
                    {busy ? t("applying") : t("apply")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

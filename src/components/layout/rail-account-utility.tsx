"use client";

import { ArrowUpRight, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localeMeta, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSessionUser } from "./session-context";

export function RailAccountUtility({
  expanded,
  onNavigate,
}: {
  expanded: boolean;
  onNavigate: () => void;
}) {
  const t = useTranslations("account");
  const user = useSessionUser();
  const locale = useLocale() as AppLocale;
  const tooltipSide = localeMeta[locale].dir === "rtl" ? "left" : "right";

  const profileLink = (
    <Link
      href="/profile"
      onClick={onNavigate}
      data-tour="profile-plan"
      aria-label={expanded ? undefined : t("openProfileFor", { name: user.name })}
      className={cn(
        "group flex min-h-11 items-center rounded-lg text-ink-on-rail outline-none",
        "transition-colors duration-(--motion-fast) hover:bg-white/8",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        expanded ? "gap-2.5 px-2 py-2" : "h-11 w-11 justify-center",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-semibold text-ink-on-rail ring-1 ring-inset ring-white/10">
        {user.initials || <UserRound aria-hidden="true" className="h-4 w-4" />}
      </span>
      {expanded && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{user.name}</span>
          <span className="mt-0.5 block truncate text-[10px] text-ink-on-rail/55">
            {t("currentPlan", { plan: user.plan.name })}
          </span>
        </span>
      )}
    </Link>
  );

  return (
    <div
      className={cn(
        "mb-1 border-t border-white/10 pt-2",
        expanded ? "w-full" : "flex flex-col items-center",
      )}
    >
      {expanded ? (
        profileLink
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{profileLink}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            <span className="font-medium">{user.name}</span>
            <span className="ms-1 text-ink-muted">· {user.plan.name}</span>
          </TooltipContent>
        </Tooltip>
      )}

      {expanded && user.plan.upgradeAvailable && user.accessMode !== "read-only" && (
        <Link
          href="/billing"
          onClick={onNavigate}
          className="mt-1 flex min-h-9 items-center justify-between rounded-lg bg-brand-900/45 px-2.5 text-[11px] font-semibold text-brand-200 outline-none transition-colors duration-(--motion-fast) hover:bg-brand-900/70 hover:text-white focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          <span>{t("upgradePlan")}</span>
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

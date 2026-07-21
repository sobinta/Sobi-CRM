"use client";

import { CircleHelp, Compass, Headphones } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOnboardingTour } from "@/components/onboarding/onboarding-tour";
import { Link } from "@/i18n/navigation";

export function HelpUtility() {
  const t = useTranslations("help");
  const { replay } = useOnboardingTour();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-tour="support-entry"
          aria-label={t("title")}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted outline-none hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring sm:h-9 sm:w-9"
        >
          <CircleHelp aria-hidden="true" className="h-4.5 w-4.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/support">
            <Headphones aria-hidden="true" className="h-4 w-4 text-brand" />
            {t("openSupport")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={replay}>
          <Compass aria-hidden="true" className="h-4 w-4 text-brand" />
          {t("replayTour")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

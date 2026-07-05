"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("language");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label={t("label")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-on-rail/60 outline-none transition-colors duration-(--motion-fast) hover:bg-white/10 hover:text-ink-on-rail focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
          >
            <Languages className="h-4.5 w-4.5" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{t("label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="end">
        {routing.locales.map((l) => (
          <DropdownMenuCheckboxItem
            key={l}
            checked={l === locale}
            onCheckedChange={() => switchTo(l)}
          >
            {localeMeta[l].label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

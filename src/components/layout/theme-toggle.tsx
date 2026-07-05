"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("theme");

  // Theme is only known on the client. Render a stable Sun on the server and
  // until mounted, then swap to the resolved icon — avoids a hydration
  // mismatch (server can't know the client's resolved theme).
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical next-themes mount guard
  useEffect(() => setMounted(true), []);
  const Icon = mounted && resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label={t("label")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-on-rail/60 outline-none transition-colors duration-(--motion-fast) hover:bg-white/10 hover:text-ink-on-rail focus-visible:outline-2 focus-visible:outline-focus-ring cursor-pointer"
          >
            <Icon className="h-4.5 w-4.5" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{t("label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuCheckboxItem
          checked={theme === "light"}
          onCheckedChange={() => setTheme("light")}
        >
          <Sun className="h-4 w-4 text-ink-muted" /> {t("light")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === "dark"}
          onCheckedChange={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4 text-ink-muted" /> {t("dark")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={theme === "system"}
          onCheckedChange={() => setTheme("system")}
        >
          <Monitor className="h-4 w-4 text-ink-muted" /> {t("system")}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

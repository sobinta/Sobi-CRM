"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { Chip } from "@/components/ui/chip";
import { getModule } from "@/core/module-registry/catalog";
import { toggleModuleAction } from "./actions";
import { cn } from "@/lib/utils";

export function ModuleToggle({
  moduleKey,
  initialEnabled,
}: {
  moduleKey: string;
  initialEnabled: boolean;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const mod = getModule(moduleKey);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  if (!mod) return null;
  const Icon = mod.icon;
  const available = mod.status === "available";

  function onToggle(next: boolean) {
    setEnabled(next); // optimistic
    startTransition(async () => {
      const res = await toggleModuleAction(moduleKey, next);
      if (!res.ok) setEnabled(!next); // revert on failure
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border border-line bg-surface-raised p-4 transition-colors",
        !available && "opacity-70",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          enabled && available
            ? "bg-brand text-ink-on-brand"
            : "bg-surface-sunken text-ink-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{mod.name}</h3>
          {!available && (
            <Chip tone="neutral" dot={false}>
              {tCommon("comingSoon")}
            </Chip>
          )}
          {available && enabled && <Chip tone="positive">{t("active")}</Chip>}
        </div>
        <p className="mt-1 text-sm text-ink-muted">{mod.description}</p>
      </div>
      <div className="shrink-0 pt-0.5">
        <Switch
          checked={enabled && available}
          disabled={!available || pending}
          onCheckedChange={onToggle}
          aria-label={t("activateAria", { name: mod.name })}
        />
      </div>
    </div>
  );
}

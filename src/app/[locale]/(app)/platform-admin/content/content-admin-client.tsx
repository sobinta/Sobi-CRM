"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import {
  EDITABLE_CONTENT_KEYS,
  type EditableContentKey,
} from "@/engines/platform-admin/content-keys";
import { setContentOverrideAction } from "../actions";

/** One row per editable key × locale, saved independently on blur/save. */
export function ContentAdminClient({
  initialValues,
}: {
  initialValues: Record<string, string>;
}) {
  const t = useTranslations("platformAdmin");
  const tCommon = useTranslations("common");
  const [activeLocale, setActiveLocale] = useState<AppLocale>("en");
  const [values, setValues] = useState(initialValues);
  const [savedKey, setSavedKey] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [, startTransition] = useTransition();

  function save(key: EditableContentKey) {
    const composite = `${activeLocale}:${key}`;
    const value = values[composite] ?? "";
    setPendingKey(composite);
    setSavedKey(undefined);
    startTransition(async () => {
      const res = await setContentOverrideAction(key, activeLocale, value);
      setPendingKey(undefined);
      if (res.ok) setSavedKey(composite);
    });
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-md bg-surface-sunken p-1">
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setActiveLocale(l)}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
              activeLocale === l
                ? "bg-surface-raised text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {localeMeta[l].label}
          </button>
        ))}
      </div>

      <div className="space-y-3" dir={localeMeta[activeLocale].dir}>
        {EDITABLE_CONTENT_KEYS.map((key) => {
          const composite = `${activeLocale}:${key}`;
          return (
            <div
              key={key}
              className="rounded-xl border border-line bg-surface-raised p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <code className="text-xs text-ink-faint">{key}</code>
                {savedKey === composite && (
                  <span className="flex items-center gap-1 text-xs text-positive">
                    <Check className="h-3 w-3" /> {t("saved")}
                  </span>
                )}
              </div>
              <Textarea
                rows={2}
                placeholder={t("overridePlaceholder")}
                value={values[composite] ?? ""}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [composite]: e.target.value }));
                  setSavedKey(undefined);
                }}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingKey === composite}
                  onClick={() => save(key)}
                >
                  {pendingKey === composite ? tCommon("loading") : tCommon("save")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

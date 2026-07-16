"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import type { AnnouncementBarInput } from "@/engines/platform-admin/announcement-service";
import { setAnnouncementBarAction } from "../actions";

export function AnnouncementAdminClient({
  initial,
}: {
  initial: AnnouncementBarInput;
}) {
  const t = useTranslations("platformAdmin");
  const tCommon = useTranslations("common");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [translations, setTranslations] = useState<Record<string, string>>(
    initial.translations,
  );
  const [backgroundColor, setBackgroundColor] = useState(initial.backgroundColor);
  const [textColor, setTextColor] = useState(initial.textColor);
  const [animation, setAnimation] = useState(initial.animation);
  const [linkUrl, setLinkUrl] = useState(initial.linkUrl ?? "");
  const [activeLocale, setActiveLocale] = useState<AppLocale>("en");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await setAnnouncementBarAction({
        enabled,
        translations,
        backgroundColor,
        textColor,
        animation,
        linkUrl: linkUrl.trim() || null,
      });
      if (res.ok) setSaved(true);
    });
  }

  const previewText = translations[activeLocale] || translations.en || "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("announcementTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
          <span className="text-sm text-ink">{t("announcementEnabled")}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="flex gap-1 rounded-md bg-surface-sunken p-1">
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

        <div dir={localeMeta[activeLocale].dir}>
          <Label>{t("announcementText")}</Label>
          <Input
            value={translations[activeLocale] ?? ""}
            onChange={(e) =>
              setTranslations((prev) => ({ ...prev, [activeLocale]: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{t("backgroundColor")}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-9.5 w-11 shrink-0 cursor-pointer rounded-md border border-line bg-surface-raised"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <Label>{t("textColor")}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="h-9.5 w-11 shrink-0 cursor-pointer rounded-md border border-line bg-surface-raised"
              />
              <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} dir="ltr" />
            </div>
          </div>
        </div>

        <div>
          <Label>{t("animation")}</Label>
          <NativeSelect
            value={animation}
            onChange={(e) => setAnimation(e.target.value as "ltr" | "rtl" | "static")}
          >
            <option value="static">{t("animationStatic")}</option>
            <option value="ltr">{t("animationLtr")}</option>
            <option value="rtl">{t("animationRtl")}</option>
          </NativeSelect>
        </div>

        <div>
          <Label>{t("linkUrl")}</Label>
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            dir="ltr"
          />
        </div>

        <div>
          <Label>{t("preview")}</Label>
          <div className="overflow-hidden rounded-md border border-line">
            <AnnouncementBar
              text={previewText || "…"}
              backgroundColor={backgroundColor}
              textColor={textColor}
              animation={animation}
              linkUrl={null}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-positive">
            <Check className="h-4 w-4" /> {t("saved")}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

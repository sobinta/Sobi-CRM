"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  brandTokenCss,
  DEFAULT_BRANDING,
  type Branding,
} from "@/core/branding/brand-tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { saveBrandingAction } from "./settings-actions";

const PRESETS: Array<{ nameKey: string; hue: number }> = [
  { nameKey: "presetPetrol", hue: 193 },
  { nameKey: "presetIndigo", hue: 274 },
  { nameKey: "presetViolet", hue: 305 },
  { nameKey: "presetRose", hue: 5 },
  { nameKey: "presetAmber", hue: 65 },
  { nameKey: "presetForest", hue: 150 },
];

export function ThemeBuilder({ initial }: { initial: Branding }) {
  const t = useTranslations("admin");
  const [branding, setBranding] = useState<Branding>(initial);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Live preview: scope generated brand tokens to this subtree.
  const previewCss = `.theme-preview{${brandTokenCss(branding)}}`;

  function update(patch: Partial<Branding>) {
    setBranding((b) => ({ ...b, ...patch }));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      await saveBrandingAction(branding);
      setSaved(true);
    });
  }

  return (
    <Card className="theme-preview">
      <style dangerouslySetInnerHTML={{ __html: previewCss }} />
      <CardHeader>
        <CardTitle>{t("brandIdentity")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hue presets */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">
            {t("brandColor")}
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = Math.abs(branding.hue - p.hue) < 1;
              return (
                <button
                  key={p.nameKey}
                  type="button"
                  onClick={() => update({ hue: p.hue })}
                  className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink outline-none transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{
                      background: `oklch(0.55 0.12 ${p.hue})`,
                    }}
                  />
                  {t(p.nameKey as never)}
                  {active && <Check className="h-3.5 w-3.5 text-brand" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fine hue slider */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="hue" className="text-sm font-medium text-ink">
              {t("hue")}
            </label>
            <span className="tabular text-xs text-ink-muted">
              {Math.round(branding.hue)}°
            </span>
          </div>
          <input
            id="hue"
            type="range"
            min={0}
            max={360}
            value={branding.hue}
            onChange={(e) => update({ hue: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background:
                "linear-gradient(to right, oklch(0.6 0.15 0), oklch(0.6 0.15 60), oklch(0.6 0.15 120), oklch(0.6 0.15 180), oklch(0.6 0.15 240), oklch(0.6 0.15 300), oklch(0.6 0.15 360))",
            }}
          />
        </div>

        {/* Radius */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="radius" className="text-sm font-medium text-ink">
              {t("cornerRadius")}
            </label>
            <span className="tabular text-xs text-ink-muted">
              {branding.radius.toFixed(3)}rem
            </span>
          </div>
          <input
            id="radius"
            type="range"
            min={0.25}
            max={0.75}
            step={0.025}
            value={branding.radius}
            onChange={(e) => update({ radius: Number(e.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line-strong"
          />
        </div>

        {/* Preview swatches + components */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t("preview")}
          </p>
          <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm">
                {t("primaryAction")}
              </Button>
              <Button variant="subtle" size="sm">
                {t("subtleAction")}
              </Button>
              <Chip tone="brand">{t("brandChipLabel")}</Chip>
              <Chip tone="positive">{t("active")}</Chip>
            </div>
            <div className="flex gap-1">
              {[100, 300, 500, 700, 900].map((s) => (
                <div
                  key={s}
                  className="h-8 flex-1 rounded"
                  style={{ background: `var(--brand-${s})` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={save} disabled={pending}>
            {pending ? t("saving") : t("saveTheme")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => update(DEFAULT_BRANDING)}
            disabled={pending}
          >
            {t("resetDefault")}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-positive">
              <Check className="h-4 w-4" /> {t("saved")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

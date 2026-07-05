"use client";

import { useState, useTransition } from "react";
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

const PRESETS: Array<{ name: string; hue: number }> = [
  { name: "Petrol", hue: 193 },
  { name: "Indigo", hue: 274 },
  { name: "Violet", hue: 305 },
  { name: "Rose", hue: 5 },
  { name: "Amber", hue: 65 },
  { name: "Forest", hue: 150 },
];

export function ThemeBuilder({ initial }: { initial: Branding }) {
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
        <CardTitle>Brand identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Hue presets */}
        <div>
          <label className="mb-2 block text-sm font-medium text-ink">
            Brand color
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = Math.abs(branding.hue - p.hue) < 1;
              return (
                <button
                  key={p.name}
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
                  {p.name}
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
              Hue
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
              Corner radius
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
            Preview
          </p>
          <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm">
                Primary action
              </Button>
              <Button variant="subtle" size="sm">
                Subtle
              </Button>
              <Chip tone="brand">Brand</Chip>
              <Chip tone="positive">Active</Chip>
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
            {pending ? "Saving…" : "Save theme"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => update(DEFAULT_BRANDING)}
            disabled={pending}
          >
            Reset to default
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-positive">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

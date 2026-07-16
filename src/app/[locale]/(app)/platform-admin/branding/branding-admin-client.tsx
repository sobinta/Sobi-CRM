"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo, LogoMark } from "@/components/brand/logo";
import { setSiteAssetAction } from "../actions";

export function BrandingAdminClient({
  initialLogo,
  initialFavicon,
}: {
  initialLogo: string;
  initialFavicon: string;
}) {
  const t = useTranslations("platformAdmin");
  const tCommon = useTranslations("common");

  return (
    <div className="space-y-5">
      <AssetCard
        slot="logo"
        label={t("logoUrl")}
        initialValue={initialLogo}
        preview={(url) => <Logo size={28} src={url || undefined} />}
        t={t}
        tCommon={tCommon}
      />
      <AssetCard
        slot="favicon"
        label={t("faviconUrl")}
        initialValue={initialFavicon}
        preview={(url) => <LogoMark size={32} src={url || undefined} />}
        t={t}
        tCommon={tCommon}
      />
    </div>
  );
}

function AssetCard({
  slot,
  label,
  initialValue,
  preview,
  t,
  tCommon,
}: {
  slot: "logo" | "favicon";
  label: string;
  initialValue: string;
  preview: (url: string) => React.ReactNode;
  t: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}) {
  const [url, setUrl] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await setSiteAssetAction(slot, url);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-16 items-center rounded-lg border border-dashed border-line bg-surface-sunken px-4">
          {preview(url)}
        </div>
        <div>
          <Label htmlFor={`asset-${slot}`}>{label}</Label>
          <Input
            id={`asset-${slot}`}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setSaved(false);
            }}
            placeholder="https://…"
            dir="ltr"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="primary" onClick={save} disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
        {url && (
          <Button
            variant="ghost"
            onClick={() => {
              setUrl("");
              startTransition(async () => {
                const res = await setSiteAssetAction(slot, "");
                if (res.ok) setSaved(true);
              });
            }}
            disabled={pending}
          >
            {t("clearOverride")}
          </Button>
        )}
        {saved && (
          <span className="flex items-center gap-1 text-sm text-positive">
            <Check className="h-4 w-4" /> {t("saved")}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

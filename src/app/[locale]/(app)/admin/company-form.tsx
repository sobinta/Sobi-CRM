"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveCompanyAction } from "./settings-actions";

export function CompanyForm({ initialName }: { initialName: string }) {
  const t = useTranslations("admin");
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await saveCompanyAction(name);
      if (res.ok) setSaved(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("companyCardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-sm">
          <Label htmlFor="company">{t("workspaceName")}</Label>
          <Input
            id="company"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={save}
            disabled={pending || name.trim().length < 2}
          >
            {pending ? t("saving") : t("save")}
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

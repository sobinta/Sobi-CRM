"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getContractLetterheadAction, saveContractLetterheadAction } from "./actions";
import type { ContractLetterheadSettings } from "@/engines/contracts/letterhead";
import { useDemoMode } from "@/components/layout/session-context";

/** The "digital-signature designer / config section" required to live within the Contracts module: company letterhead + signatory + default calendar. */
export function LetterheadDialog() {
  const t = useTranslations("contracts");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<ContractLetterheadSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    if (open && !settings) {
      void getContractLetterheadAction().then(setSettings);
    }
  }, [open, settings]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      return;
    }
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveContractLetterheadAction({
        companyName: form.get("companyName"),
        logoUrl: form.get("logoUrl"),
        addressLine: form.get("addressLine"),
        signatoryName: form.get("signatoryName"),
        signatoryTitle: form.get("signatoryTitle"),
        footerText: form.get("footerText"),
        calendarMode: form.get("calendarMode"),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1.5">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Stamp className="h-3.5 w-3.5" /> {t("letterheadButton")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {settings ? (
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>{t("letterheadTitle")}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <p className="text-sm text-ink-muted">{t("letterheadDescription")}</p>
              <div>
                <Label htmlFor="companyName" required>
                  {t("companyNameLabel")}
                </Label>
                <Input id="companyName" name="companyName" required defaultValue={settings.companyName} />
              </div>
              <div>
                <Label htmlFor="logoUrl">{t("logoUrlLabel")}</Label>
                <Input id="logoUrl" name="logoUrl" dir="ltr" defaultValue={settings.logoUrl ?? ""} placeholder="https://…" />
              </div>
              <div>
                <Label htmlFor="addressLine">{t("addressLabel")}</Label>
                <Input id="addressLine" name="addressLine" defaultValue={settings.addressLine ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="signatoryName">{t("signatoryNameLabel")}</Label>
                  <Input id="signatoryName" name="signatoryName" defaultValue={settings.signatoryName ?? ""} />
                </div>
                <div>
                  <Label htmlFor="signatoryTitle">{t("signatoryTitleLabel")}</Label>
                  <Input id="signatoryTitle" name="signatoryTitle" defaultValue={settings.signatoryTitle ?? ""} />
                </div>
              </div>
              <div>
                <Label htmlFor="footerText">{t("footerTextLabel")}</Label>
                <Input id="footerText" name="footerText" defaultValue={settings.footerText ?? ""} />
              </div>
              <div>
                <Label htmlFor="calendarMode">{t("calendarModeLabel")}</Label>
                <NativeSelect id="calendarMode" name="calendarMode" defaultValue={settings.calendarMode}>
                  <option value="jalali">{t("calendarJalali")}</option>
                  <option value="gregorian">{t("calendarGregorian")}</option>
                </NativeSelect>
              </div>
              {saved && <p className="text-xs font-medium text-positive">{t("letterheadSaved")}</p>}
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" type="button">
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button variant="primary" type="submit" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogBody>
            <p className="py-6 text-center text-sm text-ink-muted">{t("loading")}</p>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
      {simulated && (
        <p role="status" className="text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
    </div>
  );
}

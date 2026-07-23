"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createCaseAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export function NewCaseButton() {
  const t = useTranslations("moduleImmigration");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCaseAction({
        clientName: form.get("clientName"),
        visaType: form.get("visaType"),
        authority: form.get("authority"),
        deadline: form.get("deadline"),
        customFields,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {t("newCase")}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newCaseDialogTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="clientName" required>{t("clientNameLabel")}</Label>
              <Input id="clientName" name="clientName" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="visaType" required>{t("visaTypeLabel")}</Label>
                <NativeSelect id="visaType" name="visaType" defaultValue="work">
                  <option value="work">{t("visaWork")}</option>
                  <option value="student">{t("visaStudent")}</option>
                  <option value="family">{t("visaFamily")}</option>
                  <option value="business">{t("visaBusiness")}</option>
                  <option value="asylum">{t("visaAsylum")}</option>
                  <option value="permanent">{t("visaPermanent")}</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="deadline">{t("deadlineLabel")}</Label>
                <Input id="deadline" name="deadline" type="date" dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="authority">{t("authorityLabel")}</Label>
              <Input id="authority" name="authority" placeholder={t("authorityPlaceholder")} />
            </div>
            <BusinessCustomFields entityKey="immigration_case" onChange={setCustomFields} />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("createCase")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

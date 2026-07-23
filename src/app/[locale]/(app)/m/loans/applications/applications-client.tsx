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
import { createLoanApplicationAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export function NewLoanApplicationButton() {
  const t = useTranslations("moduleLoans");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createLoanApplicationAction({
        applicantName: form.get("applicantName"),
        purpose: form.get("purpose"),
        amount: form.get("amount"),
        termMonths: form.get("termMonths"),
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
        <Plus className="h-4 w-4" /> {t("newApplication")}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newApplicationDialogTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="applicantName" required>{t("applicantNameLabel")}</Label>
              <Input id="applicantName" name="applicantName" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="purpose" required>{t("purposeLabel")}</Label>
                <NativeSelect id="purpose" name="purpose" defaultValue="home">
                  <option value="home">{t("purposeHome")}</option>
                  <option value="auto">{t("purposeAuto")}</option>
                  <option value="business">{t("purposeBusiness")}</option>
                  <option value="personal">{t("purposePersonal")}</option>
                  <option value="student">{t("purposeStudent")}</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="termMonths">{t("termMonthsLabel")}</Label>
                <Input id="termMonths" name="termMonths" type="number" min={1} defaultValue={12} dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="amount">{t("amountLabel")}</Label>
              <Input id="amount" name="amount" type="number" min={0} defaultValue={0} dir="ltr" />
            </div>
            <BusinessCustomFields entityKey="loan_application" onChange={setCustomFields} />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("createApplication")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

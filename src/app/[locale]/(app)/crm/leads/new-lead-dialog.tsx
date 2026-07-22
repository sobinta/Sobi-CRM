"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createManualLeadAction } from "../actions";

/** Manually record an inbound lead — the counterpart to the public website form. */
export function NewLeadDialog() {
  const t = useTranslations("leads");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createManualLeadAction({
        title: form.get("title"),
        companyName: form.get("companyName"),
        industry: form.get("industry"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message"),
        estimatedValue: form.get("estimatedValue") || undefined,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary" size="sm">
          <Plus className="h-3.5 w-3.5" /> {t("newLead")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("newLeadTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-ink-muted">{t("newLeadDescription")}</p>
            <div>
              <Label htmlFor="title" required>
                {t("titleLabel")}
              </Label>
              <Input id="title" name="title" required autoFocus placeholder={t("titlePlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="companyName">{t("companyLabel")}</Label>
                <Input id="companyName" name="companyName" />
              </div>
              <div>
                <Label htmlFor="industry">{t("industryLabel")}</Label>
                <Input id="industry" name="industry" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input id="email" name="email" type="email" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="phone">{t("phoneLabel")}</Label>
                <Input id="phone" name="phone" type="tel" dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="message">{t("messageLabel")}</Label>
              <Textarea id="message" name="message" rows={3} />
            </div>
            <div>
              <Label htmlFor="estimatedValue">{t("valueLabel")}</Label>
              <Input id="estimatedValue" name="estimatedValue" type="number" min={0} dir="ltr" />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
import { createPolicyAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export function NewPolicyButton() {
  const t = useTranslations("moduleInsurance");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPolicyAction({
        policyNumber: form.get("policyNumber"),
        product: form.get("product"),
        premium: form.get("premium"),
        commission: form.get("commission"),
        expiresAt: form.get("expiresAt"),
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
        <Plus className="h-4 w-4" /> {t("newPolicy")}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newPolicy")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="policyNumber" required>{t("policyNumberLabel")}</Label>
                <Input id="policyNumber" name="policyNumber" required autoFocus />
              </div>
              <div>
                <Label htmlFor="product" required>{t("productLabel")}</Label>
                <NativeSelect id="product" name="product" defaultValue="auto">
                  <option value="auto">{t("productAuto")}</option>
                  <option value="home">{t("productHome")}</option>
                  <option value="life">{t("productLife")}</option>
                  <option value="health">{t("productHealth")}</option>
                  <option value="business">{t("productBusiness")}</option>
                </NativeSelect>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="premium">{t("premiumLabel")}</Label>
                <Input id="premium" name="premium" type="number" min={0} defaultValue={0} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="commission">{t("commissionLabel")}</Label>
                <Input id="commission" name="commission" type="number" min={0} defaultValue={0} dir="ltr" />
              </div>
            </div>
            <div>
              <Label htmlFor="expiresAt">{t("expiryDateLabel")}</Label>
              <Input id="expiresAt" name="expiresAt" type="date" dir="ltr" />
            </div>
            <BusinessCustomFields entityKey="policy" onChange={setCustomFields} />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("createPolicy")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

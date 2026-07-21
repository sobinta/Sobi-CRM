"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createDealAction } from "../actions";
import { useTranslations } from "next-intl";

export function DealsToolbar() {
  const t = useTranslations("deals");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createDealAction({
        title: form.get("title"),
        value: form.get("value"),
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
        <Plus className="h-4 w-4" /> {t("newDeal")}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newDeal")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="title" required>
                {t("dealTitle")}
              </Label>
              <Input id="title" name="title" required autoFocus />
            </div>
            <div>
              <Label htmlFor="value">{t("value")}</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min={0}
                step={100}
                defaultValue={0}
                dir="ltr"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("creating") : t("createDeal")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

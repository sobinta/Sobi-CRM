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

export interface ServiceOption {
  id: string;
  name: string;
}

type ActionResult = { ok: boolean };

/**
 * Shared "new appointment / reservation" dialog for the booking modules
 * (barber, salon, restaurant). The server action and labels are injected so
 * each module keeps its own permission-guarded action.
 */
export function AppointmentDialog({
  services,
  action,
  triggerLabel,
  title,
  customerLabel,
  showPartySize = false,
}: {
  services: ServiceOption[];
  action: (input: unknown) => Promise<ActionResult>;
  triggerLabel: string;
  title: string;
  customerLabel?: string;
  showPartySize?: boolean;
}) {
  const t = useTranslations("bookingModules");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const effectiveCustomerLabel = customerLabel ?? t("customerName");

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action({
        customerName: form.get("customerName"),
        serviceId: form.get("serviceId") || undefined,
        startAt: form.get("startAt"),
        partySize: form.get("partySize") || undefined,
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
        <Plus className="h-4 w-4" /> {triggerLabel}
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="customerName" required>{effectiveCustomerLabel}</Label>
              <Input id="customerName" name="customerName" required autoFocus />
            </div>
            {services.length > 0 && (
              <div>
                <Label htmlFor="serviceId">{t("serviceLabel")}</Label>
                <NativeSelect id="serviceId" name="serviceId" defaultValue="">
                  <option value="">—</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </NativeSelect>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startAt" required>{t("dateTime")}</Label>
                <Input id="startAt" name="startAt" type="datetime-local" required dir="ltr" />
              </div>
              {showPartySize && (
                <div>
                  <Label htmlFor="partySize">{t("partySize")}</Label>
                  <Input id="partySize" name="partySize" type="number" min={1} defaultValue={2} dir="ltr" />
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("saving") : triggerLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { convertLeadAction } from "../actions";

export interface ConvertibleLead {
  id: string;
  title: string;
  companyName: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  estimatedValue?: number | string | null;
}

/** Best-effort first/last name split from a lead's title, for the form's default values. */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

/**
 * The "convert lead → contact" dialog, shared by the leads list (quick
 * action) and the lead detail page. Captures richer fields than the raw lead
 * carries (job title, service interest, an extra note) so the resulting
 * Contact starts with more useful information.
 */
export function ConvertLeadDialog({
  lead,
  trigger,
  onConverted,
}: {
  lead: ConvertibleLead;
  trigger?: ReactNode;
  /** Called with the new contact id on success. Defaults to navigating there. */
  onConverted?: (contactId: string) => void;
}) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [withDeal, setWithDeal] = useState(true);
  const nameParts = splitName(lead.title);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await convertLeadAction({
        leadId: lead.id,
        createDeal: withDeal,
        dealAmount: form.get("dealAmount") || undefined,
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone"),
        jobTitle: form.get("jobTitle"),
        companyName: form.get("companyName"),
        industry: form.get("industry"),
        serviceInterest: form.get("serviceInterest"),
        notes: form.get("notes"),
      });
      if (res.ok) {
        setOpen(false);
        if (onConverted) onConverted(res.contactId);
        else router.push(`/crm/contacts/${res.contactId}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary" size="sm">
            <ArrowLeftRight className="h-3.5 w-3.5" /> {t("convert")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("convertTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-ink-muted">{t("convertIntro")}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" required>
                  {t("firstNameLabel")}
                </Label>
                <Input id="firstName" name="firstName" defaultValue={nameParts.first} required autoFocus />
              </div>
              <div>
                <Label htmlFor="lastName">{t("lastNameLabel")}</Label>
                <Input id="lastName" name="lastName" defaultValue={nameParts.last} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">{t("emailLabel")}</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="phone">{t("phoneLabel")}</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="companyName">{t("companyLabel")}</Label>
                <Input id="companyName" name="companyName" defaultValue={lead.companyName ?? ""} />
              </div>
              <div>
                <Label htmlFor="industry">{t("industryLabel")}</Label>
                <Input id="industry" name="industry" defaultValue={lead.industry ?? ""} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="jobTitle">{t("jobTitleLabel")}</Label>
                <Input id="jobTitle" name="jobTitle" />
              </div>
              <div>
                <Label htmlFor="serviceInterest">{t("serviceInterestLabel")}</Label>
                <Input id="serviceInterest" name="serviceInterest" />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t("notesLabel")}</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder={t("notesPlaceholder")} />
            </div>

            <label className="flex items-center justify-between text-sm">
              <span className="text-ink">{t("createDealLabel")}</span>
              <Switch checked={withDeal} onCheckedChange={setWithDeal} />
            </label>
            {withDeal && (
              <div>
                <Label htmlFor="dealAmount">{t("dealAmountLabel")}</Label>
                <Input
                  id="dealAmount"
                  name="dealAmount"
                  type="number"
                  min={0}
                  defaultValue={lead.estimatedValue ? String(lead.estimatedValue) : ""}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? t("converting") : t("convertSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

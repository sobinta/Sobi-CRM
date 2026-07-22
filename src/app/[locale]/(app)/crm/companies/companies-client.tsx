"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createCompanyAction, updateCompanyAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export interface CompanyFormValues {
  id?: string;
  name?: string;
  industry?: string | null;
  size?: string | null;
  phone?: string | null;
  website?: string | null;
}

/** Shared create/edit form body for a Company. */
function CompanyFormFields({ defaults }: { defaults?: CompanyFormValues }) {
  const t = useTranslations("companies");
  return (
    <>
      <div>
        <Label htmlFor="name" required>
          {t("nameLabel")}
        </Label>
        <Input id="name" name="name" required autoFocus defaultValue={defaults?.name ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="industry">{t("industryLabel")}</Label>
          <Input id="industry" name="industry" defaultValue={defaults?.industry ?? ""} />
        </div>
        <div>
          <Label htmlFor="size">{t("sizeLabel")}</Label>
          <Input id="size" name="size" placeholder={t("sizePlaceholder")} defaultValue={defaults?.size ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone">{t("phoneLabel")}</Label>
          <Input id="phone" name="phone" dir="ltr" defaultValue={defaults?.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="website">{t("websiteLabel")}</Label>
          <Input id="website" name="website" dir="ltr" defaultValue={defaults?.website ?? ""} />
        </div>
      </div>
    </>
  );
}

export function CompaniesToolbar() {
  const t = useTranslations("companies");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCompanyAction({
        name: form.get("name"),
        industry: form.get("industry"),
        website: form.get("website"),
        phone: form.get("phone"),
        size: form.get("size"),
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
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus className="h-4 w-4" /> {t("newCompany")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>{t("newCompany")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <CompanyFormFields />
            <BusinessCustomFields entityKey="company" onChange={setCustomFields} />
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

/** Edit-in-place dialog for the company detail page. */
export function EditCompanyDialog({ company }: { company: Required<CompanyFormValues> }) {
  const t = useTranslations("companies");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCompanyAction(company.id, {
        name: form.get("name"),
        industry: form.get("industry"),
        website: form.get("website"),
        phone: form.get("phone"),
        size: form.get("size"),
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
        <Button variant="ghost" size="sm">
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <CompanyFormFields defaults={company} />
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
      </DialogContent>
    </Dialog>
  );
}

export function CompaniesSearch({ initial }: { initial: string }) {
  const t = useTranslations("companies");
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/crm/companies${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
      className="relative max-w-xs"
    >
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="ps-9"
      />
    </form>
  );
}

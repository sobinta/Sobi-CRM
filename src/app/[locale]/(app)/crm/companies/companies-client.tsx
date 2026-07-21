"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Search } from "lucide-react";
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
import { createCompanyAction } from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export function CompaniesToolbar() {
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
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> شرکت جدید
      </Button>
      <DialogContent>
        <form onSubmit={onCreate}>
          <DialogHeader>
            <DialogTitle>شرکت جدید</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <Label htmlFor="name" required>نام شرکت</Label>
              <Input id="name" name="name" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="industry">صنعت</Label>
                <Input id="industry" name="industry" />
              </div>
              <div>
                <Label htmlFor="size">اندازه</Label>
                <Input id="size" name="size" placeholder="۱۱–۵۰" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">تلفن</Label>
                <Input id="phone" name="phone" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="website">وب‌سایت</Label>
                <Input id="website" name="website" dir="ltr" />
              </div>
            </div>
            <BusinessCustomFields entityKey="company" onChange={setCustomFields} />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">انصراف</Button>
            </DialogClose>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "در حال ثبت…" : "ثبت شرکت"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CompaniesSearch({ initial }: { initial: string }) {
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
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی شرکت…" className="ps-9" />
    </form>
  );
}

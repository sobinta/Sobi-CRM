"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { EmptyState } from "@/components/patterns/empty-state";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createContractAction } from "./actions";

export interface ContractRow {
  id: string;
  contractNo: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ContactOption {
  id: string;
  name: string;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  sent: "info",
  viewed: "warning",
  accepted: "positive",
  canceled: "danger",
};

const statusLabel: Record<string, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال‌شده",
  viewed: "دیده‌شده",
  accepted: "تأییدشده",
  canceled: "لغوشده",
};

export function ContractsClient({
  contracts,
  contacts,
}: {
  contracts: ContractRow[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createContractAction({
        title: form.get("title"),
        contactId: form.get("contactId") || undefined,
        subject: form.get("subject"),
        amount: form.get("amount"),
        durationLabel: form.get("durationLabel"),
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/crm/contracts/${res.id}`);
      }
    });
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> قرارداد جدید
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>قرارداد جدید</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="title" required>عنوان</Label>
                  <Input id="title" name="title" required autoFocus placeholder="قرارداد مشاوره‌ی فروش" />
                </div>
                <div>
                  <Label htmlFor="contactId">مخاطب</Label>
                  <NativeSelect id="contactId" name="contactId" defaultValue="">
                    <option value="">بدون مخاطب</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="subject" required>موضوع قرارداد</Label>
                  <Input id="subject" name="subject" required placeholder="بهبود فرایند فروش و راه‌اندازی CRM" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="amount" required>مبلغ (تومان)</Label>
                    <Input id="amount" name="amount" type="number" min={0} required dir="ltr" />
                  </div>
                  <div>
                    <Label htmlFor="durationLabel">مدت</Label>
                    <Input id="durationLabel" name="durationLabel" placeholder="۳ ماه" />
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">انصراف</Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? "در حال ساخت…" : "ساخت قرارداد"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="قراردادی ثبت نشده"
          description="از روی مخاطب یا معامله، اولین قرارداد را بسازید."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">شماره</th>
                <th className="px-4 py-2.5 text-start font-medium">عنوان</th>
                <th className="px-4 py-2.5 text-start font-medium">مبلغ</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contracts.map((c) => (
                <tr key={c.id} className="bg-surface-raised transition-colors hover:bg-surface-sunken/50">
                  <td className="px-4 py-3">
                    <Link href={`/crm/contracts/${c.id}`} className="font-mono text-xs font-medium text-ink hover:text-brand">
                      {c.contractNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{c.title}</td>
                  <td className="px-4 py-3 tabular text-ink-muted">
                    {c.amount.toLocaleString("fa-IR")} {c.currency}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[c.status] ?? "neutral"}>
                      {statusLabel[c.status] ?? c.status}
                    </Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

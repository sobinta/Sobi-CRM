"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createCampaignAction } from "./actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

export interface CampaignRow {
  id: string;
  name: string;
  segmentKey: string;
  status: string;
  recipientCount: number;
  createdAt: string;
}

export interface SegmentOption {
  key: string;
  name: string;
  description: string;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  generating: "warning",
  ready: "info",
  sent: "positive",
};
const statusLabel: Record<string, string> = {
  draft: "پیش‌نویس",
  generating: "در حال تولید",
  ready: "آماده‌ی بازبینی",
  sent: "ارسال‌شده",
};

export function CampaignsClient({
  campaigns,
  segments,
}: {
  campaigns: CampaignRow[];
  segments: SegmentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [segmentKey, setSegmentKey] = useState(segments[0]?.key ?? "");
  const [pending, startTransition] = useTransition();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCampaignAction({
        name: form.get("name"),
        segmentKey: form.get("segmentKey"),
        goal: form.get("goal"),
        customFields,
      });
      if (res.ok) {
        setOpen(false);
        router.push(`/crm/campaigns/${res.id}`);
      }
    });
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> کمپین جدید
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>کمپین ایمیلی جدید</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="name" required>نام کمپین</Label>
                  <Input id="name" name="name" required autoFocus placeholder="فعال‌سازی مجدد لیدهای سرد" />
                </div>
                <div>
                  <Label htmlFor="segmentKey" required>سگمنت</Label>
                  <NativeSelect
                    id="segmentKey"
                    name="segmentKey"
                    value={segmentKey}
                    onChange={(e) => setSegmentKey(e.target.value)}
                  >
                    {segments.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </NativeSelect>
                  <p className="mt-1 text-xs text-ink-faint">
                    {segments.find((s) => s.key === segmentKey)?.description}
                  </p>
                </div>
                <div>
                  <Label htmlFor="goal" required>هدف کمپین (برای AI)</Label>
                  <Textarea
                    id="goal"
                    name="goal"
                    required
                    rows={3}
                    placeholder="دعوت مجدد به همکاری و معرفی خدمات مشاوره‌ی جدید"
                  />
                </div>
                <BusinessCustomFields entityKey="campaign" onChange={setCustomFields} />
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">انصراف</Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? "در حال ساخت…" : "ساخت کمپین"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="کمپینی ساخته نشده"
          description="یک سگمنت انتخاب کنید تا AI برای هر گیرنده ایمیلی اختصاصی بنویسد."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">نام</th>
                <th className="px-4 py-2.5 text-start font-medium">گیرندگان</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((c) => (
                <tr key={c.id} className="bg-surface-raised transition-colors hover:bg-surface-sunken/50">
                  <td className="px-4 py-3">
                    <Link href={`/crm/campaigns/${c.id}`} className="font-medium text-ink hover:text-brand">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 tabular text-ink-muted">{c.recipientCount}</td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[c.status] ?? "neutral"}>{statusLabel[c.status] ?? c.status}</Chip>
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

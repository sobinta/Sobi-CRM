"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { UserPlus, ArrowLeftRight, Eye, Sparkles, Copy, Check, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { convertLeadAction } from "../actions";
import { scoreLeadAction, suggestContentForLeadAction } from "@/app/[locale]/(app)/ai/actions";

export interface LeadRow {
  id: string;
  title: string;
  companyName: string | null;
  email: string | null;
  status: string;
  source: string | null;
  score: number;
  scoreRationale: string | null;
  contactId: string | null;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  new: "info",
  working: "warning",
  qualified: "positive",
  unqualified: "neutral",
  converted: "brand",
};

const statusLabel: Record<string, string> = {
  new: "جدید",
  working: "در حال بررسی",
  qualified: "واجد شرایط",
  unqualified: "رد شده",
  converted: "تبدیل‌شده",
};

function scoreTone(score: number): ChipProps["tone"] {
  if (score >= 70) return "positive";
  if (score >= 40) return "warning";
  if (score > 0) return "danger";
  return "neutral";
}

export function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [converting, setConverting] = useState<LeadRow | null>(null);
  const [withDeal, setWithDeal] = useState(true);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{
    lead: LeadRow;
    articleTitle: string;
    message: string;
  } | null>(null);
  const [noSuggestionFor, setNoSuggestionFor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function scoreLead(id: string) {
    setScoringId(id);
    startTransition(async () => {
      await scoreLeadAction(id);
      setScoringId(null);
      router.refresh();
    });
  }

  function suggestContent(lead: LeadRow) {
    setSuggestingId(lead.id);
    setNoSuggestionFor(null);
    startTransition(async () => {
      const res = await suggestContentForLeadAction(lead.id);
      setSuggestingId(null);
      if (res) {
        setCopied(false);
        setSuggestion({ lead, articleTitle: res.articleTitle, message: res.message });
      } else {
        setNoSuggestionFor(lead.id);
      }
    });
  }

  function copySuggestion() {
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion.message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function doConvert() {
    if (!converting) return;
    startTransition(async () => {
      const res = await convertLeadAction(converting.id, {
        createDeal: withDeal,
        dealAmount: amount ? Number(amount) : undefined,
      });
      setConverting(null);
      if (res.ok) router.push(`/crm/contacts/${res.contactId}`);
      else router.refresh();
    });
  }

  if (leads.length === 0) {
    return (
      <div className="px-6 py-4">
        <EmptyState
          icon={UserPlus}
          title="هنوز لیدی ثبت نشده"
          description="لیدها از فرم مشاوره‌ی سایت و چت‌بات به اینجا می‌آیند."
        />
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken text-xs text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">لید</th>
              <th className="px-4 py-2.5 text-start font-medium">کسب‌وکار</th>
              <th className="px-4 py-2.5 text-start font-medium">منبع</th>
              <th className="px-4 py-2.5 text-start font-medium">امتیاز</th>
              <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
              <th className="px-4 py-2.5 text-end font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {leads.map((l) => (
              <tr key={l.id} className="bg-surface-raised">
                <td className="px-4 py-3 font-medium text-ink">{l.title}</td>
                <td className="px-4 py-3 text-ink-muted">{l.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {l.source === "website" ? "وب‌سایت" : l.source === "chatbot" ? "چت‌بات" : l.source ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {l.score > 0 ? (
                    <span className="flex items-center gap-1.5" title={l.scoreRationale ?? ""}>
                      <Chip tone={scoreTone(l.score)}>{l.score}</Chip>
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => scoreLead(l.id)}
                      disabled={pending && scoringId === l.id}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {scoringId === l.id ? "…" : "امتیاز AI"}
                    </Button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Chip tone={statusTone[l.status] ?? "neutral"}>
                    {statusLabel[l.status] ?? l.status}
                  </Chip>
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => suggestContent(l)}
                      disabled={pending && suggestingId === l.id}
                      title="پیشنهاد محتوای پیگیری بر اساس پایگاه دانش"
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      {suggestingId === l.id
                        ? "…"
                        : noSuggestionFor === l.id
                          ? "مقاله‌ای یافت نشد"
                          : "پیشنهاد محتوا"}
                    </Button>
                    {l.status === "converted" && l.contactId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/crm/contacts/${l.contactId}`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> مشاهده‌ی مخاطب
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setConverting(l)}>
                        <ArrowLeftRight className="h-3.5 w-3.5" /> تبدیل به مخاطب
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!converting} onOpenChange={(o) => !o && setConverting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تبدیل لید به مخاطب</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-sm text-ink-muted">
              «{converting?.title}» به یک مخاطب (و در صورت وجود، شرکت) ارتقا می‌یابد. لید اصلی دست‌نخورده می‌ماند.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span className="text-ink">ساخت معامله همراه با تبدیل</span>
              <Switch checked={withDeal} onCheckedChange={setWithDeal} />
            </label>
            {withDeal && (
              <div>
                <Label htmlFor="amt">مبلغ تخمینی (تومان)</Label>
                <Input
                  id="amt"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">انصراف</Button>
            </DialogClose>
            <Button variant="primary" onClick={doConvert} disabled={pending}>
              {pending ? "در حال تبدیل…" : "تبدیل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suggestion} onOpenChange={(o) => !o && setSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>پیشنهاد محتوای پیگیری</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-ink-muted">
              برای «{suggestion?.lead.title}» — بر اساس مقاله‌ی «{suggestion?.articleTitle}»
            </p>
            <Textarea value={suggestion?.message ?? ""} readOnly rows={6} className="text-sm" />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">بستن</Button>
            </DialogClose>
            <Button variant="primary" onClick={copySuggestion}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "کپی شد" : "کپی پیام"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

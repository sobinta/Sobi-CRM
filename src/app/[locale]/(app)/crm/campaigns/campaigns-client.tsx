"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus, Megaphone, Users, Mail, Wallet } from "lucide-react";
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
import { createCampaignAction, getSegmentStatsAction } from "./actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";
import { useDemoMode } from "@/components/layout/session-context";
import type { SegmentStats } from "@/engines/campaigns/segments";

export interface CampaignRow {
  id: string;
  name: string;
  segmentKey: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  createdAt: string;
}

export interface SegmentOption {
  key: string;
  nameKey: string;
  descriptionKey: string;
}

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  generating: "warning",
  ready: "info",
  sent: "positive",
};

export function CampaignsClient({
  campaigns,
  segments,
}: {
  campaigns: CampaignRow[];
  segments: SegmentOption[];
}) {
  const t = useTranslations("campaigns");
  const tShell = useTranslations("shell");
  const demoMode = useDemoMode();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [segmentKey, setSegmentKey] = useState(segments[0]?.key ?? "");
  const [stats, setStats] = useState<SegmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    if (!open || !segmentKey) return;
    let cancelled = false;
    setTimeout(() => {
      if (cancelled) return;
      setStatsLoading(true);
      setStats(null);
    }, 0);
    void getSegmentStatsAction(segmentKey).then((res) => {
      if (!cancelled) {
        setStats(res);
        setStatsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, segmentKey]);

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (demoMode) {
      setOpen(false);
      setSimulated(true);
      e.currentTarget.reset();
      return;
    }
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
      {simulated && (
        <p role="status" className="mb-3 text-xs font-medium text-brand">
          {tShell("demoSimulation")}
        </p>
      )}
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("newCampaign")}
          </Button>
          <DialogContent>
            <form onSubmit={onCreate}>
              <DialogHeader>
                <DialogTitle>{t("newCampaignTitle")}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div>
                  <Label htmlFor="name" required>{t("nameLabel")}</Label>
                  <Input id="name" name="name" required autoFocus placeholder={t("namePlaceholder")} />
                </div>
                <div>
                  <Label htmlFor="segmentKey" required>{t("segmentLabel")}</Label>
                  <NativeSelect
                    id="segmentKey"
                    name="segmentKey"
                    value={segmentKey}
                    onChange={(e) => setSegmentKey(e.target.value)}
                  >
                    {segments.map((s) => (
                      <option key={s.key} value={s.key}>{t(`segments.${s.nameKey}.name`)}</option>
                    ))}
                  </NativeSelect>
                  <p className="mt-1 text-xs text-ink-faint">
                    {t(`segments.${segments.find((s) => s.key === segmentKey)?.descriptionKey}.description`)}
                  </p>
                  <div className="mt-2 rounded-md border border-line bg-surface-sunken/50 p-2.5">
                    {statsLoading ? (
                      <p className="text-xs text-ink-faint">{t("statsLoading")}</p>
                    ) : stats ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("statsTotal", { count: stats.totalCount })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("statsReachable", { count: Math.min(stats.emailableCount, 20) })}
                        </span>
                        {typeof stats.totalValue === "number" && (
                          <span className="inline-flex items-center gap-1" dir="ltr">
                            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                            {new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(stats.totalValue)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div>
                  <Label htmlFor="goal" required>{t("goalLabel")}</Label>
                  <Textarea
                    id="goal"
                    name="goal"
                    required
                    rows={3}
                    placeholder={t("goalPlaceholder")}
                  />
                </div>
                <BusinessCustomFields entityKey="campaign" onChange={setCustomFields} />
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" type="button">{t("cancel")}</Button>
                </DialogClose>
                <Button variant="primary" type="submit" disabled={pending}>
                  {pending ? t("creating") : t("createCampaign")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t("emptyTitle")}
          description={t("emptyBody")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnName")}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnRecipients")}</th>
                <th className="px-4 py-2.5 text-start font-medium">{t("columnStatus")}</th>
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
                  <td className="px-4 py-3 tabular text-ink-muted">
                    {t("recipientsCell", { sent: c.sentCount, total: c.recipientCount })}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={statusTone[c.status] ?? "neutral"}>{t(`statuses.${c.status}`)}</Chip>
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

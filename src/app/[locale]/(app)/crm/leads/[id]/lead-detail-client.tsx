"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Sparkles,
  MessageSquareText,
  Copy,
  Check,
  Pencil,
  Mail,
  Phone,
  Briefcase,
  CalendarClock,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
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
import { scoreLeadAction, suggestContentForLeadAction } from "@/app/[locale]/(app)/ai/actions";
import { updateLeadAction } from "../../actions";
import { leadScoreTone } from "@/engines/crm/lead-format";

export interface LeadDetail {
  id: string;
  title: string;
  companyName: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  source: string | null;
  score: number;
  scoreRationale: string | null;
  estimatedValue: number | null;
  message: string | null;
  createdAt: string;
}

export function LeadDetailClient({ lead }: { lead: LeadDetail }) {
  const t = useTranslations("leads");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scoring, setScoring] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ articleTitle: string; message: string } | null>(null);
  const [noSuggestion, setNoSuggestion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function score() {
    setScoring(true);
    startTransition(async () => {
      await scoreLeadAction(lead.id);
      setScoring(false);
      router.refresh();
    });
  }

  function suggest() {
    setSuggesting(true);
    setNoSuggestion(false);
    startTransition(async () => {
      const res = await suggestContentForLeadAction(lead.id);
      setSuggesting(false);
      if (res) {
        setCopied(false);
        setSuggestion(res);
      } else {
        setNoSuggestion(true);
      }
    });
  }

  function copyMessage() {
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion.message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateLeadAction(lead.id, {
        title: form.get("title"),
        companyName: form.get("companyName"),
        industry: form.get("industry"),
        email: form.get("email"),
        phone: form.get("phone"),
        estimatedValue: form.get("estimatedValue") || undefined,
      });
      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>{t("detailsCardTitle")}</CardTitle>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Pencil className="h-3.5 w-3.5" /> {t("editLead")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={onEditSubmit}>
                <DialogHeader>
                  <DialogTitle>{t("editLeadTitle")}</DialogTitle>
                </DialogHeader>
                <DialogBody className="space-y-3">
                  <div>
                    <Label htmlFor="title" required>
                      {t("titleLabel")}
                    </Label>
                    <Input id="title" name="title" defaultValue={lead.title} required autoFocus />
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
                      <Label htmlFor="email">{t("emailLabel")}</Label>
                      <Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} dir="ltr" />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t("phoneLabel")}</Label>
                      <Input id="phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="estimatedValue">{t("estimatedValueLabel")}</Label>
                    <Input
                      id="estimatedValue"
                      name="estimatedValue"
                      type="number"
                      min={0}
                      defaultValue={lead.estimatedValue ?? ""}
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
                    {pending ? t("saving") : t("save")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailRow icon={Briefcase} label={t("companyLabel")} value={lead.companyName} />
          <DetailRow icon={Briefcase} label={t("industry")} value={lead.industry} />
          <DetailRow icon={Mail} label={t("emailLabel")} value={lead.email} dir="ltr" />
          <DetailRow icon={Phone} label={t("phoneLabel")} value={lead.phone} dir="ltr" />
          <DetailRow
            icon={CalendarClock}
            label={t("submitted")}
            value={new Date(lead.createdAt).toLocaleDateString()}
          />
          {lead.estimatedValue != null && (
            <DetailRow
              icon={Coins}
              label={t("estimatedValueLabel")}
              value={String(lead.estimatedValue)}
              dir="ltr"
            />
          )}
        </CardContent>
      </Card>

      {lead.message && (
        <Card>
          <CardHeader>
            <CardTitle>{t("messagePreviewTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-ink">{lead.message}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> {t("scoreCardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lead.score > 0 ? (
            <>
              <Chip tone={leadScoreTone(lead.score)}>
                {t("score")}: {lead.score}
              </Chip>
              {lead.scoreRationale && <p className="text-sm text-ink-muted">{lead.scoreRationale}</p>}
              <Button variant="ghost" size="sm" onClick={score} disabled={scoring}>
                <Sparkles className="h-3.5 w-3.5" /> {scoring ? t("scoring") : t("rescoreCta")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-faint">{t("scoreEmpty")}</p>
              <Button variant="secondary" size="sm" onClick={score} disabled={scoring}>
                <Sparkles className="h-3.5 w-3.5" /> {scoring ? t("scoring") : t("scoreCta")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-accent" /> {t("suggestCardTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestion ? (
            <>
              <p className="text-xs text-ink-faint">
                {t("suggestFor")} «{suggestion.articleTitle}»
              </p>
              <Textarea value={suggestion.message} readOnly rows={5} className="text-sm" />
              <Button variant="primary" size="sm" onClick={copyMessage}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("copied") : t("copyMessage")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-faint">
                {noSuggestion ? t("noSuggestion") : t("suggestEmpty")}
              </p>
              <Button variant="secondary" size="sm" onClick={suggest} disabled={suggesting}>
                <MessageSquareText className="h-3.5 w-3.5" /> {suggesting ? t("suggesting") : t("suggestCta")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
      <span className="shrink-0 text-ink-faint">{label}:</span>
      <span className="truncate text-ink" dir={dir}>
        {value || "—"}
      </span>
    </div>
  );
}

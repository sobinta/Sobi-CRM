"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import {
  UserPlus,
  Eye,
  Sparkles,
  Copy,
  Check,
  MessageSquareText,
  Download,
  Search,
  Mail,
  Phone,
  Briefcase,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/ui/chip";
import { Card, CardContent } from "@/components/ui/card";
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
import { scoreLeadAction, suggestContentForLeadAction } from "@/app/[locale]/(app)/ai/actions";
import { LEAD_STATUSES, LEAD_STATUS_TONE, leadScoreTone } from "@/engines/crm/lead-format";
import { downloadCsv } from "@/lib/csv-export";
import { ConvertLeadDialog } from "./convert-lead-dialog";
import { NewLeadDialog } from "./new-lead-dialog";

export interface LeadRow {
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
  contactId: string | null;
}

export function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const t = useTranslations("leads");
  const router = useRouter();
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const status of LEAD_STATUSES) c[status] = 0;
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        (l.companyName ?? "").toLowerCase().includes(q) ||
        (l.email ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, statusFilter, search]);

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

  function exportCsv() {
    downloadCsv(
      "leads.csv",
      [
        { key: "title", label: t("titleLabel") },
        { key: "companyName", label: t("companyLabel") },
        { key: "industry", label: t("industry") },
        { key: "email", label: t("emailLabel") },
        { key: "phone", label: t("phoneLabel") },
        { key: "source", label: t("sourceLabel") },
        { key: "score", label: t("score") },
        { key: "status", label: t("statusLabel") },
        { key: "createdAt", label: t("submitted") },
      ],
      visibleLeads.map((l) => ({
        title: l.title,
        companyName: l.companyName ?? "",
        industry: l.industry ?? "",
        email: l.email ?? "",
        phone: l.phone ?? "",
        source: l.source ?? "",
        score: l.score,
        status: t(`status.${l.status}` as never),
        createdAt: new Date(l.createdAt).toLocaleDateString(),
      })),
    );
  }

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={`${t("all")} (${counts.all})`}
          />
          {LEAD_STATUSES.map((status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              label={`${t(`status.${status}`)} (${counts[status] ?? 0})`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="ps-8"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <NewLeadDialog />
        </div>
      </div>

      {visibleLeads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-3">
          {visibleLeads.map((l) => (
            <Card key={l.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link href={`/crm/leads/${l.id}`} className="min-w-0 flex-1 outline-none focus-visible:underline">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink hover:underline">
                        {l.title}
                      </h3>
                      <Chip tone={LEAD_STATUS_TONE[l.status] ?? "neutral"}>
                        {t(`status.${l.status}` as never)}
                      </Chip>
                    </div>
                  </Link>
                  {l.score > 0 ? (
                    <Chip tone={leadScoreTone(l.score)} title={l.scoreRationale ?? ""}>
                      {t("score")}: {l.score}
                    </Chip>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => scoreLead(l.id)}
                      disabled={pending && scoringId === l.id}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {scoringId === l.id ? "…" : t("scoreCta")}
                    </Button>
                  )}
                </div>

                <div className="grid gap-1.5 text-xs text-ink-muted sm:grid-cols-2">
                  {(l.companyName || l.industry) && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      {[l.companyName, l.industry].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {l.email && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      {l.email}
                    </span>
                  )}
                  {l.phone && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                      {l.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                    {t("submitted")}: {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone="neutral" dot={false}>
                    {t(`sources.${l.source ?? "unknown"}` as never)}
                  </Chip>
                </div>

                {l.message && (
                  <p className="line-clamp-2 rounded-md bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
                    {l.message}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => suggestContent(l)}
                    disabled={pending && suggestingId === l.id}
                    title={t("suggestCta")}
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    {suggestingId === l.id
                      ? t("suggesting")
                      : noSuggestionFor === l.id
                        ? t("noSuggestion")
                        : t("suggestCta")}
                  </Button>
                  {l.status === "converted" && l.contactId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/crm/contacts/${l.contactId}`)}
                    >
                      <Eye className="h-3.5 w-3.5" /> {t("viewContact")}
                    </Button>
                  ) : (
                    <ConvertLeadDialog
                      lead={{
                        id: l.id,
                        title: l.title,
                        companyName: l.companyName,
                        industry: l.industry,
                        email: l.email,
                        phone: l.phone,
                        estimatedValue: l.estimatedValue,
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!suggestion} onOpenChange={(o) => !o && setSuggestion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("suggestCardTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-sm text-ink-muted">
              {t("suggestFor")} «{suggestion?.articleTitle}»
            </p>
            <Textarea value={suggestion?.message ?? ""} readOnly rows={6} className="text-sm" />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={copySuggestion}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("copied") : t("copyMessage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-brand px-3 py-1 text-xs font-medium text-ink-on-brand"
          : "rounded-full bg-surface-sunken px-3 py-1 text-xs font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
      }
    >
      {label}
    </button>
  );
}

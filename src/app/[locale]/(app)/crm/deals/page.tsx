import { notFound } from "next/navigation";
import { Trophy, XCircle, Clock } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listDealsByStage, getDealPipelineSummary } from "@/engines/crm/deal-service";
import { PageHeader } from "@/components/patterns/page-header";
import { KanbanBoard, type KanbanColumn, type KanbanStageOption } from "./kanban-board";
import { DealsToolbar } from "./deals-toolbar";
import type { ChipProps } from "@/components/ui/chip";
import { getTranslations } from "next-intl/server";

const stageTranslationKey: Record<string, string> = {
  new: "stageNew",
  qualified: "stageQualified",
  consultation: "stageConsultation",
  proposal: "stageProposal",
  negotiation: "stageNegotiation",
  won: "stageWon",
  lost: "stageLost",
};

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()} ${currency}`;
  }
}

export default async function DealsPage() {
  const [data, summary, t] = await Promise.all([
    withPlatformContext(() => listDealsByStage()),
    withPlatformContext(() => getDealPipelineSummary()),
    getTranslations("deals"),
  ]);
  if (!data || !summary) notFound();

  const stageName = (key: string, fallback: string) =>
    stageTranslationKey[key] ? t(stageTranslationKey[key]) : fallback;

  // Active (non-terminal) columns drive the board; every stage (including
  // Won/Lost) is offered in each card's "move to" options menu.
  const activeColumns: KanbanColumn[] = data.columns
    .filter((col) => !col.stage.isWon && !col.stage.isLost)
    .map((col) => ({
      stageId: col.stage.id,
      name: stageName(col.stage.key, col.stage.name),
      tone: col.stage.tone as ChipProps["tone"],
      total: col.total,
      deals: col.deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value),
        currency: d.currency,
        contactName: d.contact
          ? `${d.contact.firstName} ${d.contact.lastName}`
          : undefined,
        companyName: d.company?.name ?? undefined,
      })),
    }));

  const allStages: KanbanStageOption[] = data.columns.map((col) => ({
    stageId: col.stage.id,
    name: stageName(col.stage.key, col.stage.name),
    isWon: col.stage.isWon,
    isLost: col.stage.isLost,
  }));

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpTopic="deals"
        actions={<DealsToolbar />}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <KanbanBoard columns={activeColumns} allStages={allStages} />

        <div className="px-4 pb-6 sm:px-6">
          <h2 className="mb-3 text-sm font-semibold text-ink">{t("summaryTitle")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={Trophy}
              tone="positive"
              label={t("wonLabel")}
              value={money(summary.wonValue, summary.currency)}
              count={t("dealsCount", { count: summary.wonCount })}
            />
            <SummaryCard
              icon={XCircle}
              tone="danger"
              label={t("lostLabel")}
              value={money(summary.lostValue, summary.currency)}
              count={t("dealsCount", { count: summary.lostCount })}
            />
            <SummaryCard
              icon={Clock}
              tone="info"
              label={t("pendingLabel")}
              value={money(summary.pendingValue, summary.currency)}
              count={t("dealsCount", { count: summary.pendingCount })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  tone,
  label,
  value,
  count,
}: {
  icon: typeof Trophy;
  tone: "positive" | "danger" | "info";
  label: string;
  value: string;
  count: string;
}) {
  const toneClass = {
    positive: "text-positive",
    danger: "text-danger",
    info: "text-info",
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-surface-raised p-4 shadow-raised">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass}`} aria-hidden="true" />
      </div>
      <p className={`mt-2 tabular text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-faint">{count}</p>
    </div>
  );
}

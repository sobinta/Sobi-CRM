import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listDealsByStage } from "@/engines/crm/deal-service";
import { PageHeader } from "@/components/patterns/page-header";
import { KanbanBoard, type KanbanColumn } from "./kanban-board";
import { DealsToolbar } from "./deals-toolbar";
import type { ChipProps } from "@/components/ui/chip";
import { getTranslations } from "next-intl/server";

const stageTranslationKey: Record<string, string> = {
  new: "stageNew",
  qualified: "stageQualified",
  proposal: "stageProposal",
  negotiation: "stageNegotiation",
  won: "stageWon",
  lost: "stageLost",
};

export default async function DealsPage() {
  const [data, t] = await Promise.all([
    withPlatformContext(() => listDealsByStage()),
    getTranslations("deals"),
  ]);
  if (!data) notFound();

  const columns: KanbanColumn[] = data.columns.map((col) => ({
    stageId: col.stage.id,
    name: stageTranslationKey[col.stage.key]
      ? t(stageTranslationKey[col.stage.key])
      : col.stage.name,
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<DealsToolbar />}
      />
      <div className="min-h-0 flex-1">
        <KanbanBoard columns={columns} />
      </div>
    </div>
  );
}

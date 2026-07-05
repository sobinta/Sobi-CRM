import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { ensureDefaultPipeline } from "@/engines/pipeline/pipeline-service";

/**
 * Deal service — CRM deals on top of the Pipeline Engine. Stage moves emit
 * events, log a stage_change activity to the timeline, and mark won/lost.
 */

export interface DealInput {
  title: string;
  value?: number;
  currency?: string;
  contactId?: string | null;
  companyId?: string | null;
  expectedCloseAt?: Date | null;
  stageId?: string;
}

export async function listDealsByStage() {
  authorize("crm.deal.read");
  const pipeline = await ensureDefaultPipeline("deal");
  const deals = await db.deal.findMany({
    where: { pipelineId: pipeline.id, status: "open" },
    include: {
      contact: { select: { firstName: true, lastName: true } },
      company: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group by stage for the kanban board.
  const byStage = new Map<string, typeof deals>();
  for (const stage of pipeline.stages) byStage.set(stage.id, []);
  for (const deal of deals) {
    const arr = byStage.get(deal.stageId);
    if (arr) arr.push(deal);
  }

  return {
    pipeline,
    columns: pipeline.stages.map((stage) => ({
      stage,
      deals: byStage.get(stage.id) ?? [],
      total: (byStage.get(stage.id) ?? []).reduce(
        (sum, d) => sum + Number(d.value),
        0,
      ),
    })),
  };
}

export async function getDeal(id: string) {
  authorize("crm.deal.read");
  return db.deal.findFirst({
    where: { id },
    include: { contact: true, company: true, stage: true, pipeline: true },
  });
}

export async function createDeal(input: DealInput) {
  authorize("crm.deal.create");
  const ctx = requireContext();
  const pipeline = await ensureDefaultPipeline("deal");
  const firstStage = pipeline.stages[0];

  const deal = await db.deal.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      pipelineId: pipeline.id,
      stageId: input.stageId ?? firstStage.id,
      value: new Prisma.Decimal(input.value ?? 0),
      currency: input.currency ?? "EUR",
      contactId: input.contactId,
      companyId: input.companyId,
      expectedCloseAt: input.expectedCloseAt,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });

  await Promise.all([
    publish({
      type: "deal.created",
      entityType: "deal",
      entityId: deal.id,
      payload: { title: deal.title, value: Number(deal.value) },
    }),
    record({
      category: "DATA",
      action: "deal.create",
      entityType: "deal",
      entityId: deal.id,
    }),
    addActivity({
      entityType: "deal",
      entityId: deal.id,
      kind: "system",
      title: "Deal created",
    }),
  ]);

  return deal;
}

/** Move a deal to a stage — the core kanban interaction. */
export async function moveDealToStage(dealId: string, stageId: string) {
  authorize("crm.deal.update");

  const [deal, stage] = await Promise.all([
    db.deal.findFirst({ where: { id: dealId }, include: { stage: true } }),
    db.stage.findFirst({ where: { id: stageId } }),
  ]);
  if (!deal || !stage) throw new Error("Deal or stage not found");
  if (deal.stageId === stageId) return deal;

  const status = stage.isWon ? "won" : stage.isLost ? "lost" : "open";
  const updated = await db.deal.update({
    where: { id: dealId },
    data: {
      stageId,
      status,
      closedAt: stage.isWon || stage.isLost ? new Date() : null,
    },
  });

  await Promise.all([
    publish({
      type:
        status === "won"
          ? "deal.won"
          : status === "lost"
            ? "deal.lost"
            : "deal.stage_changed",
      entityType: "deal",
      entityId: dealId,
      payload: { fromStage: deal.stage.name, toStage: stage.name },
    }),
    record({
      category: "DATA",
      action: "deal.stage_change",
      entityType: "deal",
      entityId: dealId,
      before: { stage: deal.stage.name },
      after: { stage: stage.name },
    }),
    addActivity({
      entityType: "deal",
      entityId: dealId,
      kind: "stage_change",
      title: `Moved to ${stage.name}`,
      meta: { from: deal.stage.name, to: stage.name },
    }),
  ]);

  return updated;
}

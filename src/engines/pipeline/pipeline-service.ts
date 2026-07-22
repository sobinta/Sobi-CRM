import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Pipeline Engine — generic staged-record machinery shared by deals and the
 * pipeline-driven business modules (insurance, loans, real estate, …).
 * Handles pipeline/stage definitions and stage transitions with ordering.
 */

export interface StageSeed {
  key: string;
  name: string;
  tone?: string;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}

/**
 * Default sales pipeline stages: 5 active stages a deal moves through (new →
 * reviewing → consultation → proposal sent → final contract phase), plus the
 * two terminal outcomes. Won/Lost deals leave the active kanban board — see
 * the closed-deals summary below it instead.
 */
export const DEFAULT_DEAL_STAGES: StageSeed[] = [
  { key: "new", name: "New", tone: "neutral", probability: 10 },
  { key: "qualified", name: "Reviewing", tone: "info", probability: 25 },
  { key: "consultation", name: "Consultation", tone: "accent", probability: 45 },
  { key: "proposal", name: "Proposal sent", tone: "warning", probability: 65 },
  { key: "negotiation", name: "Final contract phase", tone: "brand", probability: 85 },
  { key: "won", name: "Won", tone: "positive", probability: 100, isWon: true },
  { key: "lost", name: "Lost", tone: "danger", probability: 0, isLost: true },
];

/** Ensure a default pipeline+stages exist for an entity type; return it. */
export async function ensureDefaultPipeline(
  entityType = "deal",
  stages: StageSeed[] = DEFAULT_DEAL_STAGES,
) {
  const ctx = requireContext();
  const existing = await db.pipeline.findFirst({
    where: { entityType, isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  if (existing) return existing;

  const pipeline = await db.pipeline.create({
    data: {
      tenantId: ctx.tenantId,
      entityType,
      key: "default",
      name: "Default",
      isDefault: true,
      stages: {
        create: stages.map((s, i) => ({
          tenantId: ctx.tenantId,
          key: s.key,
          name: s.name,
          position: i,
          tone: s.tone ?? "neutral",
          probability: s.probability ?? 0,
          isWon: s.isWon ?? false,
          isLost: s.isLost ?? false,
        })),
      },
    },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  return pipeline;
}

export async function getPipelineWithStages(entityType = "deal") {
  return db.pipeline.findFirst({
    where: { entityType, isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
}

import { Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { requireSuperAdmin } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { getContext } from "@/core/tenancy/context";

/**
 * Platform-wide pricing plans shown on the public marketing page. Not
 * tenant-scoped — this is site content the super admin manages, not CRM
 * data, so it uses a system capability gated by requireSuperAdmin() rather
 * than the tenant permission system.
 */

export interface PlanTranslation {
  name: string;
  desc: string;
  priceMonthly: string;
  priceAnnual: string;
  cta: string;
  features: string[];
}

export interface PricingPlanInput {
  key: string;
  order: number;
  recommended: boolean;
  isCustom: boolean;
  translations: Record<string, PlanTranslation>;
}

export async function listPricingPlans() {
  requireSuperAdmin();
  return systemDb.pricingPlan.findMany({ orderBy: { order: "asc" } });
}

/** Public read — no auth required, used by the landing page itself. */
export async function listPricingPlansPublic() {
  return systemDb.pricingPlan.findMany({ orderBy: { order: "asc" } });
}

export async function createPricingPlan(input: PricingPlanInput) {
  requireSuperAdmin();
  const plan = await systemDb.pricingPlan.create({
    data: { ...input, translations: input.translations as unknown as Prisma.InputJsonValue },
  });
  await auditLog("platform.pricing_plan.create", plan.id);
  return plan;
}

export async function updatePricingPlan(id: string, input: PricingPlanInput) {
  requireSuperAdmin();
  const plan = await systemDb.pricingPlan.update({
    where: { id },
    data: { ...input, translations: input.translations as unknown as Prisma.InputJsonValue },
  });
  await auditLog("platform.pricing_plan.update", plan.id);
  return plan;
}

export async function deletePricingPlan(id: string) {
  requireSuperAdmin();
  await systemDb.pricingPlan.delete({ where: { id } });
  await auditLog("platform.pricing_plan.delete", id);
}

async function auditLog(action: string, entityId: string) {
  const ctx = getContext();
  await record({
    category: "ADMIN",
    action,
    entityType: "pricingPlan",
    entityId,
    tenantId: ctx?.tenantId,
    actorId: ctx?.membershipId,
  });
}

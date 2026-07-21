import "server-only";
import { systemDb } from "@/core/db/system";

export async function readPlanPresentation(key: string) {
  return systemDb.pricingPlan.findUnique({
    where: { key },
    select: { key: true, order: true, translations: true },
  });
}

export async function hasHigherActivePlan(order: number): Promise<boolean> {
  const higher = await systemDb.pricingPlan.findFirst({
    where: {
      active: true,
      key: { not: "demo" },
      order: { gt: order },
    },
    orderBy: { order: "asc" },
    select: { key: true },
  });
  return Boolean(higher);
}

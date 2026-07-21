import "server-only";
import { requireContext } from "@/core/tenancy/context";
import { tenantEntitlements } from "./quota";
import { resolvePlanName } from "./plan-labels";
import { hasHigherActivePlan, readPlanPresentation } from "./plan-gateway";

export interface TenantPlanSummary {
  key: string;
  name: string;
  upgradeAvailable: boolean;
}

/**
 * Small serializable subscription view for the shared shell. The active
 * tenant comes only from PlatformContext; callers cannot select a tenant.
 */
export async function getTenantPlanSummary(
  locale: string,
): Promise<TenantPlanSummary> {
  const ctx = requireContext();
  const snapshot = await tenantEntitlements();
  const current = await readPlanPresentation(snapshot.planKey);

  const upgradeAvailable =
    ctx.accessMode !== "read-only"
    && Boolean(current)
    && await hasHigherActivePlan(current!.order);

  return {
    key: snapshot.planKey,
    name: resolvePlanName(current?.translations, locale, snapshot.planKey),
    upgradeAvailable,
  };
}

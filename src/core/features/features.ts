import { db, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import { cache } from "react";

/**
 * Feature Management — the single evaluation path for capability gating.
 *
 * A feature is enabled for a tenant when a matching FeatureGrant exists and is
 * enabled. Module activation is modeled as a MODULE feature ("module.<key>"),
 * so `hasFeature` answers both "is this beta on?" and "is this module active?".
 *
 * Grants are loaded once per request (cached) to avoid repeated queries.
 */

export const loadTenantFeatures = cache(
  async (): Promise<Map<string, boolean>> => {
    const ctx = getContext();
    const map = new Map<string, boolean>();
    if (!ctx) return map;

    const grants = await db.featureGrant.findMany({
      where: { tenantId: ctx.tenantId, scope: "TENANT" },
      select: { key: true, enabled: true },
    });
    for (const g of grants) map.set(g.key, g.enabled);
    return map;
  },
);

export async function hasFeature(key: string): Promise<boolean> {
  const features = await loadTenantFeatures();
  return features.get(key) ?? false;
}

export function moduleFeatureKey(moduleKey: string): string {
  return `module.${moduleKey}`;
}

export async function isModuleEnabled(moduleKey: string): Promise<boolean> {
  return hasFeature(moduleFeatureKey(moduleKey));
}

/** Set (upsert) a tenant feature grant. Used by the Administration UI. */
export async function setFeatureGrant(
  key: string,
  enabled: boolean,
  config: Record<string, unknown> = {},
): Promise<void> {
  const ctx = getContext();
  if (!ctx) throw new Error("setFeatureGrant requires context");

  await db.featureGrant.upsert({
    where: {
      tenantId_key_scope_scopeId: {
        tenantId: ctx.tenantId,
        key,
        scope: "TENANT",
        scopeId: "",
      },
    },
    create: {
      tenantId: ctx.tenantId,
      key,
      scope: "TENANT",
      scopeId: "",
      enabled,
      config: config as Prisma.InputJsonValue,
    },
    update: { enabled, config: config as Prisma.InputJsonValue },
  });
}

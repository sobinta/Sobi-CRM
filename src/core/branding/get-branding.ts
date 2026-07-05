import { rawDb } from "@/core/db";
import { normalizeBranding, type Branding } from "./brand-tokens";

/**
 * Read a tenant's branding config from tenant.settings.branding.
 * Uses rawDb with an explicit tenantId (called from the app layout before a
 * full context is established for rendering).
 */
export async function getTenantBranding(tenantId: string): Promise<Branding> {
  const tenant = await rawDb.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings ?? {}) as {
    branding?: Partial<Branding>;
  };
  return normalizeBranding(settings.branding);
}

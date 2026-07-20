import { identityDb } from "@/core/db/identity";
import { normalizeBranding, type Branding } from "./brand-tokens";

/**
 * Read a tenant's branding config from tenant.settings.branding.
 * Uses the identity capability with an explicit tenantId (called before a
 * full context is established for rendering).
 */
export async function getTenantBranding(tenantId: string): Promise<Branding> {
  const tenant = await identityDb.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings ?? {}) as {
    branding?: Partial<Branding>;
  };
  return normalizeBranding(settings.branding);
}

import { db, Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";

/**
 * Per-tenant contract letterhead + digital-signature configuration, stored in
 * `Tenant.settings.contractLetterhead` (free-form JSON, same extension point
 * `branding` already uses) — no dedicated table needed for a single config
 * row per tenant.
 */

export interface ContractLetterheadSettings {
  companyName: string;
  logoUrl: string | null;
  addressLine: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  footerText: string | null;
  /** Admin-configurable default: which calendar new contracts render dates in. */
  calendarMode: "jalali" | "gregorian";
}

function defaults(tenantName: string): ContractLetterheadSettings {
  return {
    companyName: tenantName,
    logoUrl: null,
    addressLine: null,
    signatoryName: null,
    signatoryTitle: null,
    footerText: null,
    calendarMode: "jalali",
  };
}

function normalize(
  tenantName: string,
  input?: Partial<ContractLetterheadSettings> | null,
): ContractLetterheadSettings {
  const base = defaults(tenantName);
  if (!input) return base;
  return {
    companyName: input.companyName?.trim() || base.companyName,
    logoUrl: input.logoUrl?.trim() || null,
    addressLine: input.addressLine?.trim() || null,
    signatoryName: input.signatoryName?.trim() || null,
    signatoryTitle: input.signatoryTitle?.trim() || null,
    footerText: input.footerText?.trim() || null,
    calendarMode: input.calendarMode === "gregorian" ? "gregorian" : "jalali",
  };
}

/** Read the current tenant's letterhead/signature settings (authorized read). */
export async function getContractLetterhead(): Promise<ContractLetterheadSettings> {
  authorize("crm.contract.read");
  const ctx = requireContext();
  const tenant = await db.tenant.findFirstOrThrow({
    where: { id: ctx.tenantId },
    select: { name: true, settings: true },
  });
  const settings = (tenant.settings ?? {}) as {
    contractLetterhead?: Partial<ContractLetterheadSettings>;
  };
  return normalize(tenant.name, settings.contractLetterhead);
}

/**
 * Public — no auth, no tenant context required. Used to render the letterhead
 * on the public contract share page and the QR-verification page, given a
 * tenantId already resolved from a verified share token.
 */
export async function getContractLetterheadPublic(
  tenantId: string,
): Promise<ContractLetterheadSettings> {
  const tenant = await systemDb.tenant.findFirst({
    where: { id: tenantId },
    select: { name: true, settings: true },
  });
  if (!tenant) return defaults("");
  const settings = (tenant.settings ?? {}) as {
    contractLetterhead?: Partial<ContractLetterheadSettings>;
  };
  return normalize(tenant.name, settings.contractLetterhead);
}

/** A contract can only be digitally signed once a signatory name is configured. */
export function letterheadIsSignatureReady(settings: ContractLetterheadSettings): boolean {
  return Boolean(settings.signatoryName?.trim());
}

export async function saveContractLetterhead(
  input: Partial<ContractLetterheadSettings>,
): Promise<ContractLetterheadSettings> {
  authorize("crm.contract.update");
  const ctx = requireContext();
  const tenant = await db.tenant.findFirstOrThrow({
    where: { id: ctx.tenantId },
    select: { name: true, settings: true },
  });
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const normalized = normalize(tenant.name, input);

  await db.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      settings: {
        ...settings,
        contractLetterhead: normalized,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  await record({
    category: "DATA",
    action: "contract.letterhead.update",
    entityType: "tenant",
    entityId: ctx.tenantId,
  });
  return normalized;
}

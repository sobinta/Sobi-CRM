"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { normalizeBranding, type Branding } from "@/core/branding/brand-tokens";
import { record } from "@/core/audit/audit";

/** Persist tenant branding (Theme Builder). */
export async function saveBrandingAction(
  branding: Branding,
): Promise<{ ok: boolean }> {
  const normalized = normalizeBranding(branding);
  await withActionContext(
    async () => {
      const { tenantId } = requireContext();
      const tenant = await db.tenant.findFirstOrThrow({
        where: { id: tenantId },
        select: { settings: true },
      });
      const settings = (tenant.settings ?? {}) as Record<string, unknown>;
      await db.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...settings,
            branding: normalized,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await record({
        category: "ADMIN",
        action: "branding.update",
        entityType: "tenant",
        entityId: tenantId,
        after: normalized,
      });
    },
    { permission: "admin.settings.update" },
  );
  revalidatePath("/[locale]/(app)", "layout");
  return { ok: true };
}

/** Update basic company settings (name). */
export async function saveCompanyAction(
  name: string,
): Promise<{ ok: boolean }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false };
  await withActionContext(
    async () => {
      const { tenantId } = requireContext();
      await db.tenant.update({
        where: { id: tenantId },
        data: { name: trimmed },
      });
      await record({
        category: "ADMIN",
        action: "company.update",
        entityType: "tenant",
        entityId: tenantId,
      });
    },
    { permission: "admin.settings.update" },
  );
  revalidatePath("/[locale]/(app)", "layout");
  return { ok: true };
}

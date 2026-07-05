"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { setFeatureGrant, moduleFeatureKey } from "@/core/features/features";
import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { getModule } from "@/core/module-registry/catalog";
import { record } from "@/core/audit/audit";
import { publish } from "@/core/event-bus/bus";

/** Activate or deactivate a business module for the current tenant. */
export async function toggleModuleAction(
  moduleKey: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const mod = getModule(moduleKey);
  if (!mod) return { ok: false, error: "unknown-module" };
  if (mod.status !== "available") return { ok: false, error: "not-available" };

  try {
    await withActionContext(
      async () => {
        const { tenantId } = requireContext();
        await setFeatureGrant(moduleFeatureKey(moduleKey), enabled);
        await db.moduleState.upsert({
          where: { tenantId_moduleKey: { tenantId, moduleKey } },
          create: { tenantId, moduleKey, enabled },
          update: { enabled },
        });
        await record({
          category: "ADMIN",
          action: enabled ? "module.activate" : "module.deactivate",
          entityType: "module",
          entityId: moduleKey,
        });
        await publish({
          type: enabled ? "module.activated" : "module.deactivated",
          entityType: "module",
          entityId: moduleKey,
          payload: { moduleKey },
        });
      },
      { permission: "admin.module.update" },
    );
    revalidatePath("/[locale]/(app)/admin/modules", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

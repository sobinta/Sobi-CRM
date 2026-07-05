"use server";

import { headers } from "next/headers";
import { auth } from "@/core/auth/auth";
import { rawDb } from "@/core/db";
import { resolveSession } from "@/core/auth/session";

/**
 * Switch the active tenant for the current session. Verifies the user is a
 * member of the target tenant, then stamps Session.activeTenantId.
 */
export async function switchTenantAction(
  tenantId: string,
): Promise<{ ok: boolean }> {
  const hdrs = await headers();
  const raw = await auth.api.getSession({ headers: hdrs });
  if (!raw?.session) return { ok: false };

  const session = await resolveSession();
  const isMember = session?.memberships.some((m) => m.tenantId === tenantId);
  if (!isMember) return { ok: false };

  await rawDb.session.update({
    where: { id: raw.session.id },
    data: { activeTenantId: tenantId },
  });

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const hdrs = await headers();
  await auth.api.signOut({ headers: hdrs });
}

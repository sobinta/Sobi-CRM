"use server";

import { z } from "zod";
import { resolveSession } from "@/core/auth/session";
import { provisionTenant } from "@/core/tenancy/provisioning";

const schema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  locale: z.string().default("en"),
});

export interface ProvisionActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Create the caller's first workspace. Runs after Better Auth sign-up has
 * established a session; reads the current user and provisions a tenant with
 * them as Owner.
 */
export async function createWorkspaceAction(
  input: unknown,
): Promise<ProvisionActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  const session = await resolveSession();
  if (!session) {
    return { ok: false, error: "unauthenticated" };
  }

  // Already has a workspace → nothing to do.
  if (session.memberships.length > 0) {
    return { ok: true };
  }

  await provisionTenant({
    userId: session.userId,
    workspaceName: parsed.data.workspaceName,
    locale: parsed.data.locale,
  });

  return { ok: true };
}

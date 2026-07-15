"use client";

import { signIn } from "./client";

/**
 * Temporary, no-signup entry point so the workspace can be explored without
 * creating an account. Seeded in Phase 2 (see prisma/seed.ts / dev-environment
 * notes) — gated out of production builds since it's a standing credential
 * bypass, not something to ship to a real commercial deployment.
 */
const DEMO_CREDENTIALS = {
  email: "sara@novak.test",
  password: "changeme12345",
};

export const DEMO_LOGIN_ENABLED = process.env.NODE_ENV !== "production";

/** Signs in with the seeded demo account and redirects to the workspace. */
export async function signInDemoAndRedirect(
  locale: string,
): Promise<{ ok: true } | { ok: false; status?: number }> {
  const res = await signIn.email(DEMO_CREDENTIALS);
  if (res.error) return { ok: false, status: res.error.status };
  window.location.assign(`/${locale}/crm`);
  return { ok: true };
}

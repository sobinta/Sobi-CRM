import { headers } from "next/headers";
import { runWithContext } from "@/core/tenancy/context";
import { resolveSession, toPlatformContext } from "./session";

/**
 * Run a server function inside the current user's PlatformContext so that the
 * tenant-scoped `db` client and permission checks apply automatically.
 *
 * Returns null (does not run fn) when there is no authenticated session with
 * an active tenant — callers redirect to login/onboarding accordingly.
 */
export async function withPlatformContext<T>(
  fn: () => Promise<T>,
): Promise<T | null> {
  const session = await resolveSession();
  if (!session) return null;

  const hdrs = await headers();
  const ctx = toPlatformContext(session, {
    ipAddress:
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });
  if (!ctx) return null;

  return runWithContext(ctx, fn);
}

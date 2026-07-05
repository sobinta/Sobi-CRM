import { headers } from "next/headers";
import { runWithContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { resolveSession, toPlatformContext } from "./session";

/**
 * Run a server action inside the caller's PlatformContext, optionally
 * enforcing a permission first. Throws if unauthenticated or unauthorized so
 * actions fail loudly rather than silently no-op.
 */
export async function withActionContext<T>(
  fn: () => Promise<T>,
  options?: { permission?: string },
): Promise<T> {
  const session = await resolveSession();
  if (!session) throw new Error("Unauthenticated");

  const hdrs = await headers();
  const ctx = toPlatformContext(session, {
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: hdrs.get("user-agent") ?? undefined,
  });
  if (!ctx) throw new Error("No active tenant");

  return runWithContext(ctx, async () => {
    if (options?.permission) authorize(options.permission);
    return fn();
  });
}

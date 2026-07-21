import { headers } from "next/headers";
import { runWithContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { resolveSession, toPlatformContext } from "./session";
import { assertWritableContext } from "@/core/tenancy/access";

export interface ActionContextOptions {
  permission?: string;
  intent?: "read" | "write";
}

/**
 * Run a server action inside the caller's PlatformContext, optionally
 * enforcing a permission first. Throws if unauthenticated or unauthorized so
 * actions fail loudly rather than silently no-op.
 */
export async function withActionContext<T>(
  fn: () => Promise<T>,
  options?: ActionContextOptions,
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
    if ((options?.intent ?? "write") === "write") {
      assertWritableContext(ctx);
    }
    if (options?.permission) authorize(options.permission);
    return fn();
  });
}

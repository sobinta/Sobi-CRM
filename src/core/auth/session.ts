import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { rawDb } from "@/core/db";
import type { PlatformContext } from "@/core/tenancy/context";

/**
 * Bridges Better Auth's user session to the platform's tenant-aware context.
 *
 * resolveSession() returns the authenticated user, their memberships, the
 * currently active tenant, and the resolved permission set for that tenant —
 * everything needed to construct a PlatformContext. Cached per request.
 */

export interface ResolvedMembership {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isAdmin: boolean;
  permissions: string[];
}

export interface ResolvedSession {
  userId: string;
  email: string;
  name: string;
  locale: string;
  isSuperAdmin: boolean;
  memberships: ResolvedMembership[];
  active: ResolvedMembership | null;
}

export const resolveSession = cache(
  async (): Promise<ResolvedSession | null> => {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session?.user) return null;

    const user = await rawDb.user.findFirst({
      where: { id: session.user.id, deletedAt: null },
      include: {
        memberships: {
          where: { status: "ACTIVE", deletedAt: null },
          include: {
            tenant: true,
            roles: {
              include: {
                role: { include: { permissions: true } },
              },
            },
          },
        },
      },
    });
    if (!user) return null;

    const memberships: ResolvedMembership[] = user.memberships
      .filter((m) => m.tenant.deletedAt === null)
      .map((m) => {
        const isAdmin = m.roles.some((mr) => mr.role.isAdmin);
        const permissions = new Set<string>();
        for (const mr of m.roles) {
          for (const p of mr.role.permissions) permissions.add(p.permission);
        }
        return {
          membershipId: m.id,
          tenantId: m.tenantId,
          tenantName: m.tenant.name,
          tenantSlug: m.tenant.slug,
          isAdmin,
          permissions: [...permissions],
        };
      });

    // Active tenant: session-selected if still valid, else first membership.
    const activeTenantId = (
      session.session as { activeTenantId?: string | null }
    ).activeTenantId;
    const active =
      memberships.find((m) => m.tenantId === activeTenantId) ??
      memberships[0] ??
      null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      locale: user.locale,
      isSuperAdmin: user.isSuperAdmin,
      memberships,
      active,
    };
  },
);

/** Build a PlatformContext from a resolved session's active membership. */
export function toPlatformContext(
  session: ResolvedSession,
  opts?: { ipAddress?: string; userAgent?: string },
): PlatformContext | null {
  if (!session.active) return null;
  return {
    tenantId: session.active.tenantId,
    membershipId: session.active.membershipId,
    userId: session.userId,
    permissions: new Set(session.active.permissions),
    isAdmin: session.active.isAdmin,
    isSuperAdmin: session.isSuperAdmin,
    locale: session.locale,
    ipAddress: opts?.ipAddress,
    userAgent: opts?.userAgent,
  };
}

import { db, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import type { AuditCategory } from "@/generated/prisma/enums";

/**
 * Audit engine.
 *
 * record() writes a security/compliance trail entry. Distinct from the event
 * bus: events drive reactions; audit logs are the immutable "who did what"
 * record for security review and GDPR. Sensitive before/after values should be
 * redacted by callers before passing them here.
 */

export interface AuditInput {
  category: AuditCategory;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  /** Override actor/tenant (defaults to current context). */
  tenantId?: string;
  actorId?: string;
  actorLabel?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function record(input: AuditInput): Promise<void> {
  const ctx = getContext();
  const tenantId = input.tenantId ?? ctx?.tenantId;
  if (!tenantId) return; // nothing to attribute to

  await db.auditLog.create({
    data: {
      tenantId,
      category: input.category,
      action: input.action,
      actorId: input.actorId ?? ctx?.membershipId ?? null,
      actorLabel: input.actorLabel ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      before: (input.before ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress ?? ctx?.ipAddress ?? null,
      userAgent: input.userAgent ?? ctx?.userAgent ?? null,
    },
  });
}

export interface AuditQuery {
  category?: AuditCategory;
  entityType?: string;
  entityId?: string;
  take?: number;
  cursor?: string;
}

/** Tenant-scoped audit log read for the admin viewer. */
export async function list(query: AuditQuery = {}) {
  const ctx = getContext();
  if (!ctx) return { items: [], nextCursor: null as string | null };

  const take = Math.min(query.take ?? 50, 200);
  const items = await db.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      category: query.category,
      entityType: query.entityType,
      entityId: query.entityId,
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | null = null;
  if (items.length > take) {
    nextCursor = items[take].id;
    items.pop();
  }
  return { items, nextCursor };
}

import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { assertTenantReference } from "@/core/tenancy/relations";

/**
 * Insurance module service — policies + claims on the shared Pipeline/Finance
 * engines. Renewal reminders are surfaced by expiry queries; approving a policy
 * emits an event that automations/analytics can react to.
 */

export interface PolicyInput {
  policyNumber: string;
  product: string;
  premium?: number;
  contactId?: string | null;
  expiresAt?: Date | null;
  commission?: number;
}

export async function listPolicies(status?: string) {
  authorize("insurance.policy.read");
  return db.policy.findMany({
    where: { status },
    include: { carrier: { select: { name: true } }, _count: { select: { claims: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function policyStats() {
  authorize("insurance.policy.read");
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const [active, expiringSoon, premiumAgg, claims] = await Promise.all([
    db.policy.count({ where: { status: "active" } }),
    db.policy.count({ where: { status: "active", expiresAt: { lte: soon, gte: new Date() } } }),
    db.policy.aggregate({ where: { status: "active" }, _sum: { premium: true, commission: true } }),
    db.claim.count({ where: { status: { in: ["open", "in_review"] } } }),
  ]);
  return {
    active,
    expiringSoon,
    premium: Number(premiumAgg._sum.premium ?? 0),
    commission: Number(premiumAgg._sum.commission ?? 0),
    openClaims: claims,
  };
}

export async function createPolicy(input: PolicyInput) {
  authorize("insurance.policy.update");
  const ctx = requireContext();
  await assertTenantReference("contact", input.contactId);
  const policy = await db.policy.create({
    data: {
      tenantId: ctx.tenantId,
      policyNumber: input.policyNumber,
      product: input.product,
      premium: new Prisma.Decimal(input.premium ?? 0),
      commission: new Prisma.Decimal(input.commission ?? 0),
      contactId: input.contactId,
      expiresAt: input.expiresAt,
      status: "active",
      startAt: new Date(),
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });
  await Promise.all([
    publish({ type: "policy.created", entityType: "policy", entityId: policy.id, payload: { product: policy.product } }),
    record({ category: "DATA", action: "policy.create", entityType: "policy", entityId: policy.id }),
    addActivity({ entityType: "policy", entityId: policy.id, kind: "system", title: `Policy ${policy.policyNumber} created` }),
  ]);
  return policy;
}

export async function listClaims() {
  authorize("insurance.claim.read");
  return db.claim.findMany({
    include: { policy: { select: { policyNumber: true } } },
    orderBy: { filedAt: "desc" },
  });
}

/** Policies expiring within N days — drives renewal reminders. */
export async function expiringPolicies(days = 30) {
  authorize("insurance.policy.read");
  const until = new Date();
  until.setDate(until.getDate() + days);
  return db.policy.findMany({
    where: { status: "active", expiresAt: { lte: until, gte: new Date() } },
    orderBy: { expiresAt: "asc" },
  });
}

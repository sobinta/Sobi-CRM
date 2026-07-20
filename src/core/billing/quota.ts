import crypto from "node:crypto";
import { Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { requireContext } from "@/core/tenancy/context";

export const SAFE_FREE_LIMITS = Object.freeze({
  contacts: 500,
  members: 3,
  storageBytes: 100 * 1024 * 1024,
  apiRequestsMonthly: 10_000,
  aiTokensMonthly: 0,
});

export type QuotaMetric = keyof typeof SAFE_FREE_LIMITS;
export type PlanLimits = Record<QuotaMetric, number>;

export class QuotaExceededError extends Error {
  readonly code = "quota_exceeded";
  constructor(readonly metric: QuotaMetric, readonly limit: number) {
    super(`Quota exceeded for ${metric}.`);
    this.name = "QuotaExceededError";
  }
}

export function normalizePlanLimits(value: unknown): PlanLimits {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(SAFE_FREE_LIMITS).map(([metric, fallback]) => {
      const candidate = input[metric];
      return [
        metric,
        typeof candidate === "number" && Number.isSafeInteger(candidate) && candidate >= -1
          ? candidate
          : fallback,
      ];
    }),
  ) as PlanLimits;
}

export function quotaAllows(limit: number, current: number, increment = 1): boolean {
  return limit === -1 || current + increment <= limit;
}

interface EntitlementSnapshot {
  planKey: string;
  entitlements: ReadonlySet<string>;
  limits: PlanLimits;
  periodStart: Date;
  periodEnd: Date;
}

function calendarPeriod(now = new Date()): { periodStart: Date; periodEnd: Date } {
  return {
    periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export async function tenantEntitlements(): Promise<EntitlementSnapshot> {
  const ctx = requireContext();
  const now = new Date();
  const subscription = await systemDb.tenantSubscription.findUnique({
    where: { tenantId: ctx.tenantId },
    include: { plan: true },
  });
  if (
    subscription &&
    ["TRIALING", "ACTIVE"].includes(subscription.status) &&
    subscription.currentPeriodEnd > now &&
    subscription.plan.active
  ) {
    const entitlements = Array.isArray(subscription.plan.entitlements)
      ? subscription.plan.entitlements.filter((item): item is string => typeof item === "string")
      : [];
    return {
      planKey: subscription.planKey,
      entitlements: new Set(entitlements),
      limits: normalizePlanLimits(subscription.plan.limits),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }

  const free = await systemDb.pricingPlan.findUnique({ where: { key: "free" } });
  const period = calendarPeriod(now);
  return {
    planKey: "free",
    entitlements: new Set(
      Array.isArray(free?.entitlements)
        ? free.entitlements.filter((item): item is string => typeof item === "string")
        : [],
    ),
    limits: normalizePlanLimits(free?.limits),
    ...period,
  };
}

export async function assertRecordQuota(
  metric: QuotaMetric,
  current: number,
  increment = 1,
): Promise<void> {
  const snapshot = await tenantEntitlements();
  const limit = snapshot.limits[metric];
  if (!quotaAllows(limit, current, increment)) throw new QuotaExceededError(metric, limit);
}

/** Atomically reserve metered usage for the current subscription period. */
export async function consumeQuota(
  metric: QuotaMetric,
  amount = 1,
): Promise<bigint> {
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error("Invalid quota amount.");
  const ctx = requireContext();
  const snapshot = await tenantEntitlements();
  const limit = snapshot.limits[metric];
  if (limit === -1) return BigInt(0);
  if (amount > limit) throw new QuotaExceededError(metric, limit);
  const rows = await systemDb.$queryRaw<Array<{ value: bigint }>>(Prisma.sql`
    INSERT INTO "UsageCounter" (
      "id", "tenantId", "metric", "periodStart", "periodEnd", "value", "createdAt", "updatedAt"
    ) VALUES (
      ${crypto.randomUUID()}, ${ctx.tenantId}, ${metric}, ${snapshot.periodStart},
      ${snapshot.periodEnd}, ${BigInt(amount)}, NOW(), NOW()
    )
    ON CONFLICT ("tenantId", "metric", "periodStart") DO UPDATE
    SET "value" = "UsageCounter"."value" + ${BigInt(amount)}, "updatedAt" = NOW()
    WHERE "UsageCounter"."value" + ${BigInt(amount)} <= ${BigInt(limit)}
    RETURNING "value"
  `);
  if (!rows[0]) throw new QuotaExceededError(metric, limit);
  return rows[0].value;
}

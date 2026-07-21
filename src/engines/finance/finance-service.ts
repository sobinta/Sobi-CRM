import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";

/**
 * Finance engine — cross-module financial rollups for the Finance workspace.
 *
 * Reads existing revenue signals (deal pipeline values, contract amounts) and
 * the tenant's billing subscription, aggregating them into KPIs and breakdowns.
 * All reads are tenant-scoped via the db extension. No separate ledger yet —
 * this rolls up the money that already flows through CRM and Contracts.
 */

export interface FinanceContractBucket {
  status: string;
  count: number;
  amount: number;
}

export interface FinanceRecentDeal {
  id: string;
  title: string;
  value: number;
  currency: string;
  closedAt: string | null;
  contactName: string | null;
}

export interface FinanceSummary {
  dealCurrency: string;
  contractCurrency: string;
  wonValue: number;
  wonCount: number;
  openValue: number;
  openCount: number;
  lostCount: number;
  winRate: number;
  contractTotal: number;
  contractBuckets: FinanceContractBucket[];
  recentWon: FinanceRecentDeal[];
  subscription: {
    planKey: string;
    status: string;
    periodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export async function financeSummary(): Promise<FinanceSummary> {
  authorize("finance.dashboard.read");
  requireContext();

  const [
    wonAgg,
    openAgg,
    lostCount,
    sampleDeal,
    contractGroups,
    sampleContract,
    recentWonRows,
    subscription,
  ] = await Promise.all([
    db.deal.aggregate({ where: { status: "won" }, _sum: { value: true }, _count: { _all: true } }),
    db.deal.aggregate({ where: { status: "open" }, _sum: { value: true }, _count: { _all: true } }),
    db.deal.count({ where: { status: "lost" } }),
    db.deal.findFirst({ select: { currency: true }, orderBy: { createdAt: "desc" } }),
    db.contract.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } }),
    db.contract.findFirst({ select: { currency: true }, orderBy: { createdAt: "desc" } }),
    db.deal.findMany({
      where: { status: "won" },
      orderBy: { closedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        value: true,
        currency: true,
        closedAt: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
    db.tenantSubscription.findFirst({ orderBy: { currentPeriodEnd: "desc" } }),
  ]);

  const wonCount = wonAgg._count._all;
  const lost = lostCount;
  const decided = wonCount + lost;

  const contractBuckets: FinanceContractBucket[] = contractGroups
    .map((g) => ({
      status: g.status,
      count: g._count._all,
      amount: Number(g._sum.amount ?? 0),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    dealCurrency: sampleDeal?.currency ?? "EUR",
    contractCurrency: sampleContract?.currency ?? "IRT",
    wonValue: Number(wonAgg._sum.value ?? 0),
    wonCount,
    openValue: Number(openAgg._sum.value ?? 0),
    openCount: openAgg._count._all,
    lostCount: lost,
    winRate: decided > 0 ? Math.round((wonCount / decided) * 100) : 0,
    contractTotal: contractBuckets.reduce((s, b) => s + b.amount, 0),
    contractBuckets,
    recentWon: recentWonRows.map((d) => ({
      id: d.id,
      title: d.title,
      value: Number(d.value),
      currency: d.currency,
      closedAt: d.closedAt ? d.closedAt.toISOString() : null,
      contactName:
        d.contact != null
          ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") || null
          : null,
    })),
    subscription: subscription
      ? {
          planKey: subscription.planKey,
          status: subscription.status,
          periodEnd: subscription.currentPeriodEnd
            ? subscription.currentPeriodEnd.toISOString()
            : null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
  };
}

import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";

/**
 * Sales & Agency module — a performance view composed from the CRM Pipeline and
 * Campaigns engines. No bespoke tables: it rolls up deals and campaigns the
 * team already runs.
 */

export async function salesStats() {
  authorize("sales.campaign.read");
  requireContext();
  const [openAgg, wonAgg, openCount, activeCampaigns] = await Promise.all([
    db.deal.aggregate({ where: { status: "open" }, _sum: { value: true } }),
    db.deal.aggregate({ where: { status: "won" }, _sum: { value: true }, _count: { _all: true } }),
    db.deal.count({ where: { status: "open" } }),
    db.campaign.count({ where: { status: { in: ["draft", "review", "sending", "sent"] } } }),
  ]);
  return {
    pipelineValue: Number(openAgg._sum.value ?? 0),
    wonValue: Number(wonAgg._sum.value ?? 0),
    wonCount: wonAgg._count._all,
    openDeals: openCount,
    campaigns: activeCampaigns,
  };
}

export async function listSalesCampaigns() {
  authorize("sales.campaign.read");
  return db.campaign.findMany({
    include: { _count: { select: { emails: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

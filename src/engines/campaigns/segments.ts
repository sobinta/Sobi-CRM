import { db } from "@/core/db";

/**
 * Segment builder — code-driven audience definitions for campaigns.
 *
 * Each segment is just a name + a resolver that queries real CRM data and
 * returns up to 20 recipients who have an email address, plus a stats()
 * function giving the true (uncapped) size and any relevant aggregate for
 * the create-campaign preview and the segment picker. Adding a new segment
 * means adding one entry here; nothing else in the campaign flow needs to
 * change — this is the extension point the whole campaign feature is built
 * around.
 */

export interface SegmentRecipient {
  contactId?: string;
  leadId?: string;
  name: string;
  email: string;
  /** Recipient-specific facts fed to the AI for personalization. */
  context: Record<string, unknown>;
}

export interface SegmentStats {
  /** True matching count — not capped at MAX_RECIPIENTS. */
  totalCount: number;
  /** Recipients within the count that also have an email on file (what a campaign can actually reach). */
  emailableCount: number;
  /** Optional aggregate value (e.g. total deal value), currency-agnostic sum. */
  totalValue?: number;
}

export interface SegmentDef {
  key: string;
  /** i18n key under `campaigns.segments.<nameKey>.name` — segments.ts has no access to next-intl (server-only engine code), so the UI resolves display text from these keys. */
  nameKey: string;
  descriptionKey: string;
  resolve: () => Promise<SegmentRecipient[]>;
  stats: () => Promise<SegmentStats>;
}

const MAX_RECIPIENTS = 20;

async function lostLeads(): Promise<SegmentRecipient[]> {
  const leads = await db.lead.findMany({
    where: { status: "unqualified", email: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: MAX_RECIPIENTS,
  });
  return leads.map((l) => {
    const custom = (l.customFields ?? {}) as { message?: string; name?: string };
    return {
      leadId: l.id,
      name: custom.name ?? l.title,
      email: l.email!,
      context: {
        وضعیت: "رد شده",
        چالش: custom.message ?? l.title,
        منبع: l.source ?? "نامشخص",
      },
    };
  });
}

async function lostLeadsStats(): Promise<SegmentStats> {
  const [totalCount, emailableCount] = await Promise.all([
    db.lead.count({ where: { status: "unqualified" } }),
    db.lead.count({ where: { status: "unqualified", email: { not: null } } }),
  ]);
  return { totalCount, emailableCount };
}

async function unfollowedLeads(): Promise<SegmentRecipient[]> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000);
  const leads = await db.lead.findMany({
    where: {
      status: { in: ["new", "working"] },
      email: { not: null },
      createdAt: { lte: cutoff },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_RECIPIENTS,
  });
  return leads.map((l) => {
    const custom = (l.customFields ?? {}) as { message?: string; name?: string };
    const days = Math.floor((Date.now() - l.createdAt.getTime()) / 86_400_000);
    return {
      leadId: l.id,
      name: custom.name ?? l.title,
      email: l.email!,
      context: {
        وضعیت: "پیگیری‌نشده",
        روزهای_انتظار: days,
        چالش: custom.message ?? l.title,
      },
    };
  });
}

async function unfollowedLeadsStats(): Promise<SegmentStats> {
  const cutoff = new Date(Date.now() - 7 * 86_400_000);
  const where = { status: { in: ["new", "working"] }, createdAt: { lte: cutoff } };
  const [totalCount, emailableCount] = await Promise.all([
    db.lead.count({ where }),
    db.lead.count({ where: { ...where, email: { not: null } } }),
  ]);
  return { totalCount, emailableCount };
}

async function lostDeals(): Promise<SegmentRecipient[]> {
  const deals = await db.deal.findMany({
    where: { status: "lost", contact: { email: { not: null } } },
    include: { contact: true },
    orderBy: { closedAt: "desc" },
    take: MAX_RECIPIENTS,
  });
  return deals
    .filter((d) => d.contact?.email)
    .map((d) => ({
      contactId: d.contact!.id,
      name: `${d.contact!.firstName} ${d.contact!.lastName}`,
      email: d.contact!.email!,
      context: {
        وضعیت: "معامله‌ی ازدست‌رفته",
        عنوان_معامله: d.title,
        ارزش: Number(d.value),
      },
    }));
}

async function lostDealsStats(): Promise<SegmentStats> {
  const [totalCount, emailableCount, valueAgg] = await Promise.all([
    db.deal.count({ where: { status: "lost" } }),
    db.deal.count({ where: { status: "lost", contact: { email: { not: null } } } }),
    db.deal.aggregate({ where: { status: "lost" }, _sum: { value: true } }),
  ]);
  return { totalCount, emailableCount, totalValue: Number(valueAgg._sum.value ?? 0) };
}

async function wonCustomers(): Promise<SegmentRecipient[]> {
  const deals = await db.deal.findMany({
    where: { status: "won", contact: { email: { not: null } } },
    include: { contact: true },
    orderBy: { closedAt: "desc" },
    take: MAX_RECIPIENTS,
  });
  return deals
    .filter((d) => d.contact?.email)
    .map((d) => ({
      contactId: d.contact!.id,
      name: `${d.contact!.firstName} ${d.contact!.lastName}`,
      email: d.contact!.email!,
      context: {
        وضعیت: "مشتری فعلی",
        عنوان_معامله: d.title,
        ارزش: Number(d.value),
      },
    }));
}

async function wonCustomersStats(): Promise<SegmentStats> {
  const [totalCount, emailableCount, valueAgg] = await Promise.all([
    db.deal.count({ where: { status: "won" } }),
    db.deal.count({ where: { status: "won", contact: { email: { not: null } } } }),
    db.deal.aggregate({ where: { status: "won" }, _sum: { value: true } }),
  ]);
  return { totalCount, emailableCount, totalValue: Number(valueAgg._sum.value ?? 0) };
}

export const SEGMENTS: SegmentDef[] = [
  { key: "lost_leads", nameKey: "lostLeads", descriptionKey: "lostLeads", resolve: lostLeads, stats: lostLeadsStats },
  { key: "unfollowed_leads", nameKey: "unfollowedLeads", descriptionKey: "unfollowedLeads", resolve: unfollowedLeads, stats: unfollowedLeadsStats },
  { key: "lost_deals", nameKey: "lostDeals", descriptionKey: "lostDeals", resolve: lostDeals, stats: lostDealsStats },
  { key: "won_customers", nameKey: "wonCustomers", descriptionKey: "wonCustomers", resolve: wonCustomers, stats: wonCustomersStats },
];

export function getSegment(key: string): SegmentDef | undefined {
  return SEGMENTS.find((s) => s.key === key);
}

import { db } from "@/core/db";

/**
 * Segment builder — code-driven audience definitions for campaigns.
 *
 * Each segment is just a name + a resolver that queries real CRM data and
 * returns up to 20 recipients who have an email address. Adding a new segment
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

export interface SegmentDef {
  key: string;
  name: string;
  description: string;
  resolve: () => Promise<SegmentRecipient[]>;
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

export const SEGMENTS: SegmentDef[] = [
  { key: "lost_leads", name: "لیدهای ازدست‌رفته", description: "لیدهایی که رد شده‌اند.", resolve: lostLeads },
  { key: "unfollowed_leads", name: "لیدهای پیگیری‌نشده (۷+ روز)", description: "لیدهای باز که بیش از یک هفته پیگیری نشده‌اند.", resolve: unfollowedLeads },
  { key: "lost_deals", name: "معاملات باخته", description: "مخاطبانی که معامله‌شان بسته و ناموفق شده.", resolve: lostDeals },
  { key: "won_customers", name: "مشتریان برنده", description: "مخاطبانی با حداقل یک معامله‌ی موفق.", resolve: wonCustomers },
];

export function getSegment(key: string): SegmentDef | undefined {
  return SEGMENTS.find((s) => s.key === key);
}

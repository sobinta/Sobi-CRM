import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { publish } from "@/core/event-bus/bus";
import { getProvider } from "@/engines/ai/provider";
import { emailChannel } from "@/engines/notifications/channels";
import { getSegment, SEGMENTS, type SegmentStats } from "./segments";

/**
 * Campaign engine — human-in-the-loop personalized email campaigns.
 *
 * Creating a campaign snapshots a segment's recipients as CampaignEmail rows
 * (pending). Generation happens ONE recipient at a time (generateOne), so a
 * "generate all" loop on the client never risks a single request timing out.
 * Nothing is ever sent until an admin explicitly approves each draft.
 */

export interface CreateCampaignInput {
  name: string;
  segmentKey: string;
  goal: string;
  customFields?: Record<string, unknown>;
}

export async function createCampaign(input: CreateCampaignInput) {
  authorize("crm.campaign.create");
  const ctx = requireContext();
  const segment = getSegment(input.segmentKey);
  if (!segment) throw new Error("سگمنت نامعتبر است.");

  const recipients = await segment.resolve();

  const campaign = await db.campaign.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      segmentKey: input.segmentKey,
      goal: input.goal,
      status: "draft",
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
      emails: {
        create: recipients.map((r) => ({
          tenantId: ctx.tenantId,
          contactId: r.contactId,
          leadId: r.leadId,
          toName: r.name,
          toEmail: r.email,
          context: r.context as Prisma.InputJsonValue,
          status: "pending",
        })),
      },
    },
    include: { emails: true },
  });

  await record({
    category: "DATA",
    action: "campaign.create",
    entityType: "campaign",
    entityId: campaign.id,
    after: { segmentKey: input.segmentKey, recipientCount: recipients.length },
  });

  return campaign;
}

export interface CampaignListRow {
  id: string;
  name: string;
  segmentKey: string;
  status: string;
  createdAt: Date;
  recipientCount: number;
  sentCount: number;
}

export async function listCampaigns(): Promise<CampaignListRow[]> {
  authorize("crm.campaign.read");
  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { emails: true } } },
  });
  if (campaigns.length === 0) return [];

  const sentCounts = await db.campaignEmail.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaigns.map((c) => c.id) }, status: "sent" },
    _count: { _all: true },
  });
  const sentByCampaign = new Map(sentCounts.map((s) => [s.campaignId, s._count._all]));

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    segmentKey: c.segmentKey,
    status: c.status,
    createdAt: c.createdAt,
    recipientCount: c._count.emails,
    sentCount: sentByCampaign.get(c.id) ?? 0,
  }));
}

export async function getCampaign(id: string) {
  authorize("crm.campaign.read");
  return db.campaign.findFirst({
    where: { id },
    include: { emails: { orderBy: { toEmail: "asc" } } },
  });
}

/** True (uncapped) segment size + reachable count, for the create-campaign preview. */
export async function getSegmentStats(key: string): Promise<SegmentStats | null> {
  authorize("crm.campaign.read");
  const segment = getSegment(key);
  if (!segment) return null;
  return segment.stats();
}

export function listSegments() {
  authorize("crm.campaign.read");
  return SEGMENTS.map((s) => ({ key: s.key, nameKey: s.nameKey, descriptionKey: s.descriptionKey }));
}

async function loadAiSetting(tenantId: string) {
  const s = await db.aiSetting.findUnique({ where: { tenantId } });
  return s ?? { provider: "mock", model: null };
}

/** Generate (or regenerate) the personalized draft for a single recipient. */
export async function generateCampaignEmail(campaignEmailId: string) {
  authorize("crm.campaign.update");
  const ctx = requireContext();
  const item = await db.campaignEmail.findFirst({
    where: { id: campaignEmailId },
    include: { campaign: true },
  });
  if (!item) return null;

  const setting = await loadAiSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const context = item.context as Record<string, unknown>;
  const contextLines = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const res = await provider.complete([
    {
      role: "system",
      content:
        'یک ایمیل کاملاً شخصی‌سازی‌شده و کوتاه (حداکثر ۱۲۰ کلمه) برای این گیرنده بنویس. به وضعیت/چالش خودِ او اشاره کن، لحن تبلیغاتی نداشته باش، و با دعوت به یک جلسه‌ی مشاوره‌ی رایگان تمام کن. فقط متن ایمیل فارسی را برگردان (بدون موضوع جداگانه).',
    },
    {
      role: "user",
      content: `نام گیرنده: ${item.toName}\nهدف کمپین: ${item.campaign.goal}\nزمینه‌ی گیرنده:\n${contextLines}`,
    },
  ]);

  const bodyText =
    provider.key === "mock" || res.text.trim().length < 20
      ? mockPersonalizedEmail(item.toName, item.campaign.goal, context)
      : res.text.trim();

  const updated = await db.campaignEmail.update({
    where: { id: campaignEmailId },
    data: {
      subject: `${item.campaign.name} — ${item.toName}`,
      bodyText,
      status: "ready",
    },
  });

  await db.aiLog.create({
    data: {
      tenantId: ctx.tenantId,
      skill: "campaign_email",
      provider: provider.key,
      inputSummary: contextLines.slice(0, 500),
      outputSummary: bodyText.slice(0, 500),
      actorId: ctx.membershipId,
    },
  });

  return updated;
}

/** Deterministic, always-meaningful fallback for keyless/mock mode. */
function mockPersonalizedEmail(
  name: string,
  goal: string,
  context: Record<string, unknown>,
): string {
  const facts = Object.entries(context)
    .map(([k, v]) => `${k}: ${v}`)
    .join("، ");
  return `سلام ${name}،\n\nبا توجه به وضعیت شما (${facts})، فکر می‌کنم بتوانیم در راستای «${goal}» کمکتان کنیم.\n\nاگر مایلید، یک جلسه‌ی مشاوره‌ی رایگان و کوتاه ترتیب می‌دهیم تا دقیق‌تر بررسی کنیم.\n\nمنتظر پاسخ شما هستیم.`;
}

export async function updateCampaignEmail(id: string, subject: string, bodyText: string) {
  authorize("crm.campaign.update");
  return db.campaignEmail.update({ where: { id }, data: { subject, bodyText } });
}

/** Once every recipient is in a terminal state (sent/skipped/failed), the campaign itself is done. */
async function maybeCompleteCampaign(campaignId: string): Promise<void> {
  const outstanding = await db.campaignEmail.count({
    where: { campaignId, status: { in: ["pending", "ready"] } },
  });
  if (outstanding > 0) return;
  await db.campaign.updateMany({
    where: { id: campaignId, status: { not: "sent" } },
    data: { status: "sent", sentAt: new Date() },
  });
}

export async function skipCampaignEmail(id: string) {
  authorize("crm.campaign.update");
  const updated = await db.campaignEmail.update({ where: { id }, data: { status: "skipped" } });
  await maybeCompleteCampaign(updated.campaignId);
  return updated;
}

/** Send one approved draft. Works without RESEND/SMTP config up through review. */
export async function sendCampaignEmail(id: string) {
  authorize("crm.campaign.update");
  const ctx = requireContext();
  const item = await db.campaignEmail.findFirst({ where: { id }, include: { campaign: true } });
  if (!item || !item.subject || !item.bodyText) return { ok: false };

  try {
    await emailChannel.sendStrict({ to: item.toEmail, subject: item.subject, body: item.bodyText });
    await db.campaignEmail.update({ where: { id }, data: { status: "sent", sentAt: new Date() } });
    await db.communication.create({
      data: {
        tenantId: ctx.tenantId,
        channel: "email",
        direction: "outbound",
        subject: item.subject,
        body: item.bodyText,
        party: item.toEmail,
        status: "sent",
        entityType: item.contactId ? "contact" : item.leadId ? "lead" : undefined,
        entityId: item.contactId ?? item.leadId ?? undefined,
        actorId: ctx.membershipId,
      },
    });
    await Promise.all([
      publish({ type: "campaign.email_sent", entityType: "campaign_email", entityId: id }),
      record({ category: "DATA", action: "campaign.email_send", entityType: "campaign_email", entityId: id }),
    ]);
    await maybeCompleteCampaign(item.campaignId);
    return { ok: true };
  } catch (err) {
    await db.campaignEmail.update({
      where: { id },
      data: { status: "failed", error: (err as Error).message },
    });
    await maybeCompleteCampaign(item.campaignId);
    return { ok: false, error: (err as Error).message };
  }
}

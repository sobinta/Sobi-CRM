import crypto from "node:crypto";
import { db, rawDb, Prisma } from "@/core/db";
import { requireContext, runWithContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { toJalali } from "@/core/i18n/jalali";
import { buildContractTemplate } from "./template";
import { getProvider } from "@/engines/ai/provider";

/**
 * Contract engine — generation, the public share/acceptance lifecycle, and
 * AI-assisted rewriting/follow-up. Numbering is "CTR-<jalali year>-<seq>"; the
 * sequential counter is a simple per-tenant-per-year count (adequate at this
 * scale — a dedicated counter row would be the next step under real
 * concurrency).
 */

/** `db` is already tenant-scoped by the current context, so the count below
 *  only ever sees this tenant's contracts. */
async function nextContractNumber(): Promise<string> {
  const jy = toJalali(new Date()).year;
  const count = await db.contract.count({
    where: { contractNo: { startsWith: `CTR-${jy}-` } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `CTR-${jy}-${seq}`;
}

export interface CreateContractInput {
  title: string;
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  subject: string;
  amount: number;
  currency?: string;
  startDate?: Date;
  durationLabel?: string;
}

export async function createContract(input: CreateContractInput) {
  authorize("crm.contract.create");
  const ctx = requireContext();

  let clientName = "کارفرما";
  let companyName: string | undefined;
  if (input.contactId) {
    const contact = await db.contact.findFirst({
      where: { id: input.contactId },
      include: { company: { select: { name: true } } },
    });
    if (contact) {
      clientName = `${contact.firstName} ${contact.lastName}`;
      companyName = contact.company?.name;
    }
  }
  if (!companyName && input.companyId) {
    const company = await db.company.findFirst({ where: { id: input.companyId } });
    companyName = company?.name;
  }

  const contractNo = await nextContractNumber();
  const startDate = input.startDate ?? new Date();
  const bodyMd = buildContractTemplate({
    contractNo,
    providerName: "SOBI CRM مشاور",
    clientName,
    companyName,
    subject: input.subject,
    amount: input.amount,
    currency: input.currency ?? "تومان",
    startDate,
    durationLabel: input.durationLabel ?? "۳ ماه",
  });

  const contract = await db.contract.create({
    data: {
      tenantId: ctx.tenantId,
      contractNo,
      title: input.title,
      dealId: input.dealId,
      contactId: input.contactId,
      companyId: input.companyId,
      bodyMd,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency ?? "تومان",
      startDate,
      durationLabel: input.durationLabel ?? "۳ ماه",
      status: "draft",
      shareToken: crypto.randomBytes(24).toString("base64url"),
      createdById: ctx.membershipId,
    },
  });

  await Promise.all([
    publish({ type: "contract.created", entityType: "contract", entityId: contract.id }),
    record({ category: "DATA", action: "contract.create", entityType: "contract", entityId: contract.id }),
  ]);
  if (input.contactId) {
    await addActivity({
      entityType: "contact",
      entityId: input.contactId,
      kind: "system",
      title: `قرارداد ${contractNo} ایجاد شد`,
    });
  }

  return contract;
}

export async function listContracts() {
  authorize("crm.contract.read");
  return db.contract.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getContract(id: string) {
  authorize("crm.contract.read");
  return db.contract.findFirst({ where: { id } });
}

export async function updateContractBody(id: string, bodyMd: string) {
  authorize("crm.contract.update");
  const contract = await db.contract.findFirst({ where: { id } });
  if (!contract) return null;
  if (contract.status === "accepted") {
    throw new Error("قراردادِ تأییدشده قفل است و قابل ویرایش نیست.");
  }
  const updated = await db.contract.update({ where: { id }, data: { bodyMd } });
  await record({ category: "DATA", action: "contract.update", entityType: "contract", entityId: id });
  return updated;
}

export async function sendContract(id: string) {
  authorize("crm.contract.update");
  const updated = await db.contract.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
  await Promise.all([
    publish({ type: "contract.sent", entityType: "contract", entityId: id }),
    record({ category: "DATA", action: "contract.send", entityType: "contract", entityId: id }),
  ]);
  return updated;
}

export async function cancelContract(id: string) {
  authorize("crm.contract.update");
  const updated = await db.contract.update({ where: { id }, data: { status: "canceled" } });
  await record({ category: "DATA", action: "contract.cancel", entityType: "contract", entityId: id });
  return updated;
}

/** A minimal, permission-less context for portal/public-triggered side effects
 *  (mirrors engines/portal/portal-service.ts) — lets the event bus's
 *  automation/webhook subscribers see a tenant even though there's no signed-in
 *  actor, without granting the public caller any real access. */
function publicContext(tenantId: string) {
  return {
    tenantId,
    membershipId: "portal",
    userId: "portal",
    permissions: new Set<string>(),
    isAdmin: false,
    isSuperAdmin: false,
    locale: "fa",
  };
}

/** Public — no auth. Called from the share-token page on first client view. */
export async function markContractViewed(shareToken: string): Promise<void> {
  const contract = await rawDb.contract.findUnique({ where: { shareToken } });
  if (!contract || contract.viewedAt) return; // idempotent — only the first view counts
  if (contract.status !== "sent") return;
  await rawDb.contract.update({
    where: { id: contract.id },
    data: { status: "viewed", viewedAt: new Date() },
  });
  await runWithContext(publicContext(contract.tenantId), () =>
    publish({ type: "contract.viewed", entityType: "contract", entityId: contract.id }),
  );
}

/** Public — no auth. The client's online acceptance ("simple signature"). */
export async function acceptContractPublic(
  shareToken: string,
  acceptedByName: string,
): Promise<{ ok: boolean }> {
  const contract = await rawDb.contract.findUnique({ where: { shareToken } });
  if (!contract) return { ok: false };
  if (contract.status === "accepted" || contract.status === "canceled") return { ok: false };
  const name = acceptedByName.trim();
  if (!name) return { ok: false };

  await rawDb.contract.update({
    where: { id: contract.id },
    data: { status: "accepted", acceptedAt: new Date(), acceptedByName: name },
  });

  await runWithContext(publicContext(contract.tenantId), async () => {
    await Promise.all([
      publish({ type: "contract.accepted", entityType: "contract", entityId: contract.id }),
      record({
        category: "DATA",
        action: "contract.accept_public",
        entityType: "contract",
        entityId: contract.id,
        actorLabel: name,
      }),
      contract.contactId
        ? addActivity({
            entityType: "contact",
            entityId: contract.contactId,
            kind: "system",
            title: `قرارداد ${contract.contractNo} توسط مشتری تأیید شد`,
          })
        : Promise.resolve(),
    ]);
  });

  return { ok: true };
}

/** Public — no auth. Fetch by token for the public review page. */
export async function getContractByToken(shareToken: string) {
  return rawDb.contract.findUnique({ where: { shareToken } });
}

// --- AI-assisted ---

async function loadSetting(tenantId: string) {
  const s = await rawDb.aiSetting.findUnique({ where: { tenantId } });
  return s ?? { provider: "mock", model: null };
}

/** Rewrite the contract body personalized with the lead's challenge + AI customer knowledge. */
export async function aiRewriteContract(id: string): Promise<string | null> {
  authorize("crm.contract.update");
  const ctx = requireContext();
  const contract = await db.contract.findFirst({ where: { id } });
  if (!contract) return null;

  let context = "";
  if (contract.contactId) {
    const contact = await db.contact.findFirst({ where: { id: contract.contactId } });
    if (contact?.aiSummary) context += `شناخت مشتری: ${contact.aiSummary}\n`;
  }
  if (contract.dealId) {
    const deal = await db.deal.findFirst({ where: { id: contract.dealId } });
    if (deal) context += `فرصت فروش: ${deal.title} — ارزش ${Number(deal.value)} ${deal.currency}\n`;
  }

  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const res = await provider.complete([
    {
      role: "system",
      content:
        "این متن قرارداد مشاوره را با حفظ ساختار ۱۰ ماده‌ای و لحن رسمی، با توجه به زمینه‌ی مشتری شخصی‌سازی کن. فقط متن نهایی Markdown را برگردان.",
    },
    { role: "user", content: `زمینه:\n${context}\n\nمتن فعلی:\n${contract.bodyMd}` },
  ]);

  // Mock provider can't meaningfully rewrite long documents — keep the
  // original body rather than replace it with a truncated echo.
  const rewritten = provider.key === "mock" || res.text.length < 200 ? contract.bodyMd : res.text;

  await db.contract.update({ where: { id }, data: { bodyMd: rewritten } });
  await record({ category: "AI", action: "contract.ai_rewrite", entityType: "contract", entityId: id });
  return rewritten;
}

/** AI-drafted, polite Persian follow-up for a sent/viewed-but-unaccepted contract. */
export async function aiContractFollowUp(id: string): Promise<string | null> {
  authorize("crm.contract.read");
  const ctx = requireContext();
  const contract = await db.contract.findFirst({ where: { id } });
  if (!contract) return null;

  const anchor = contract.viewedAt ?? contract.sentAt ?? contract.createdAt;
  const days = Math.max(0, Math.floor((Date.now() - anchor.getTime()) / 86_400_000));
  const link = `/contract/${contract.shareToken}`;

  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const res = await provider.complete([
    {
      role: "system",
      content:
        "یک پیام پیگیریِ کوتاه، مؤدبانه و فارسی برای قراردادی که هنوز تأیید نشده بنویس. به تعداد روزهای انتظار و لینک قرارداد اشاره کن. حداکثر ۶۰ کلمه.",
    },
    {
      role: "user",
      content: `قرارداد ${contract.contractNo}، ${days} روز از ${contract.viewedAt ? "مشاهده" : "ارسال"} گذشته. لینک: ${link}`,
    },
  ]);

  const text =
    provider.key === "mock" || !res.text.trim()
      ? `سلام،\nپیرو ارسال قرارداد ${contract.contractNo} که ${days} روز از آن می‌گذرد، خواستم پیگیری کنم که آیا فرصت بررسی آن را داشته‌اید. برای مشاهده و تأیید می‌توانید از لینک زیر استفاده کنید:\n${link}\nمنتظر بازخورد شما هستم.`
      : res.text;

  await record({ category: "AI", action: "contract.ai_followup", entityType: "contract", entityId: id });
  return text;
}

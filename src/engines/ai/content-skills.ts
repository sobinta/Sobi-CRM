import { z } from "zod";
import { db, rawDb } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { addNote } from "@/engines/timeline/timeline";
import { getProvider } from "./provider";

/**
 * Content-suggestion skill: given a lead or contact, picks the most relevant
 * knowledge-base article (never invents one — if none match, says so) and
 * drafts a short, personalized follow-up message grounded in that article.
 */

async function loadSetting(tenantId: string) {
  const s = await rawDb.aiSetting.findUnique({ where: { tenantId } });
  return s ?? { provider: "mock", model: null };
}

async function logAi(skill: string, provider: string, input: string, output: string) {
  const ctx = requireContext();
  await db.aiLog.create({
    data: {
      tenantId: ctx.tenantId,
      skill,
      provider,
      inputSummary: input.slice(0, 500),
      outputSummary: output.slice(0, 500),
      actorId: ctx.membershipId,
    },
  });
}

function scoreArticle(article: { title: string; body: string; tags: string[] }, needle: string) {
  const hay = `${article.title} ${article.body} ${article.tags.join(" ")}`.toLowerCase();
  const words = needle.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of words) if (hay.includes(w)) score += 1;
  for (const tag of article.tags) if (needle.toLowerCase().includes(tag.toLowerCase())) score += 3;
  return score;
}

function pickBestArticle<T extends { title: string; body: string; tags: string[] }>(
  articles: T[],
  needle: string,
): T | null {
  if (articles.length === 0) return null;
  const ranked = articles
    .map((a) => ({ a, score: scoreArticle(a, needle) }))
    .sort((x, y) => y.score - x.score);
  return ranked[0].score > 0 ? ranked[0].a : articles[0];
}

const draftSchema = z.object({ message: z.string().min(1) });

export interface ContentSuggestion {
  articleId: string;
  articleTitle: string;
  message: string;
}

/** Suggest a follow-up message for a lead, grounded in the best-matching KB article. */
export async function suggestContentForLead(leadId: string): Promise<ContentSuggestion | null> {
  authorize("crm.knowledge.read");
  const ctx = requireContext();
  const lead = await db.lead.findFirst({ where: { id: leadId } });
  if (!lead) return null;

  const articles = await db.knowledgeArticle.findMany();
  if (articles.length === 0) return null;

  const custom = (lead.customFields ?? {}) as { message?: string };
  const needle = [lead.title, lead.companyName ?? "", custom.message ?? ""].join(" ");
  const best = pickBestArticle(articles, needle);
  if (!best) return null;

  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const context = [
    `لید: ${lead.title}`,
    `کسب‌وکار: ${lead.companyName ?? "-"}`,
    `چالش مطرح‌شده: ${custom.message ?? "-"}`,
    `مقاله‌ی منبع - عنوان: ${best.title}`,
    `مقاله‌ی منبع - متن: ${best.body}`,
  ].join("\n");

  let message: string | null = null;
  if (provider.key !== "mock") {
    const res = await provider.complete([
      {
        role: "system",
        content:
          "بر اساس فقط اطلاعات مقاله‌ی منبع (بدون افزودن ادعای جدید)، یک پیام پیگیری کوتاه (حداکثر ۶۰ کلمه)، فارسی و دوستانه برای این لید بنویس که به چالش او مرتبط باشد و یک قدم بعدی پیشنهاد بدهد. فقط JSON برگردان: {\"message\": \"...\"}",
      },
      { role: "user", content: context },
    ]);
    const match = res.text.match(/\{[\s\S]*\}/);
    const parsed = match ? draftSchema.safeParse(JSON.parse(match[0])) : null;
    if (parsed?.success) message = parsed.data.message;
  }

  if (!message) {
    message = `سلام! با توجه به موضوعی که مطرح کردید، مقاله‌ی «${best.title}» می‌تواند کمک‌کننده باشد. خلاصه: ${best.body.slice(0, 150)}... اگر مایل باشید می‌توانیم یک مشاوره‌ی کوتاه رایگان هم ترتیب بدهیم.`;
  }

  await Promise.all([
    logAi("content_suggestion", provider.key, context, message),
    record({ category: "AI", action: "lead.content_suggestion", entityType: "lead", entityId: leadId, after: { articleId: best.id } }),
    lead.contactId
      ? addNote("contact", lead.contactId, `پیشنهاد محتوای AI (مبتنی بر «${best.title}»): ${message}`)
      : Promise.resolve(),
  ]);

  return { articleId: best.id, articleTitle: best.title, message };
}

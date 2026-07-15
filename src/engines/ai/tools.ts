import { z } from "zod";
import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import type { AiToolSpec } from "./provider";

/**
 * The four tools available to the Chat-with-CRM assistant. Each tool is a
 * typed, read-only query against real tenant data — the model may never
 * fabricate a number; every figure in its answer must come from one of these
 * tool results. Zod validates arguments after the model proposes them.
 */

const leadsArgsSchema = z.object({
  status: z.enum(["new", "working", "qualified", "unqualified", "converted"]).optional(),
  source: z.enum(["website", "chatbot", "manual"]).optional(),
  minScore: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(50).optional(),
});

const dealsArgsSchema = z.object({
  status: z.enum(["open", "won", "lost"]).optional(),
  stageKey: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
});

const activitiesArgsSchema = z.object({
  kind: z.enum(["call", "meeting", "note", "task", "stage_change", "system", "file"]).optional(),
  entityType: z.enum(["contact", "deal", "lead"]).optional(),
  sinceDays: z.number().min(1).max(365).optional(),
  limit: z.number().min(1).max(50).optional(),
});

const statsArgsSchema = z.object({});

function zodToJsonSchema(shape: Record<string, z.ZodTypeAny>): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(shape)) {
    if (schema instanceof z.ZodEnum) {
      properties[key] = { type: "string", enum: schema.options };
    } else if (schema instanceof z.ZodNumber) {
      properties[key] = { type: "number" };
    } else {
      properties[key] = { type: "string" };
    }
  }
  return { type: "object", properties, additionalProperties: false };
}

export const TOOL_SPECS: AiToolSpec[] = [
  {
    name: "query_leads",
    description: "لیدهای CRM را با فیلتر وضعیت/منبع/حداقل امتیاز جستجو می‌کند.",
    parameters: zodToJsonSchema({
      status: leadsArgsSchema.shape.status,
      source: leadsArgsSchema.shape.source,
      minScore: leadsArgsSchema.shape.minScore,
      limit: leadsArgsSchema.shape.limit,
    }),
  },
  {
    name: "query_deals",
    description: "معاملات پایپ‌لاین را با فیلتر وضعیت (باز/برد/باخت) یا مرحله جستجو می‌کند.",
    parameters: zodToJsonSchema({
      status: dealsArgsSchema.shape.status,
      stageKey: dealsArgsSchema.shape.stageKey,
      limit: dealsArgsSchema.shape.limit,
    }),
  },
  {
    name: "query_activities",
    description: "فعالیت‌ها و وظایف اخیر (تماس، جلسه، یادداشت، وظیفه) را جستجو می‌کند.",
    parameters: zodToJsonSchema({
      kind: activitiesArgsSchema.shape.kind,
      entityType: activitiesArgsSchema.shape.entityType,
      sinceDays: activitiesArgsSchema.shape.sinceDays,
      limit: activitiesArgsSchema.shape.limit,
    }),
  },
  {
    name: "crm_stats",
    description: "آمار کلی CRM را برمی‌گرداند: تعداد لیدها به تفکیک وضعیت، معاملات باز/برد/باخت، ارزش پایپ‌لاین، نرخ تبدیل.",
    parameters: zodToJsonSchema({}),
  },
];

async function queryLeads(rawArgs: unknown) {
  const args = leadsArgsSchema.parse(rawArgs ?? {});
  const leads = await db.lead.findMany({
    where: {
      status: args.status,
      source: args.source,
      score: args.minScore ? { gte: args.minScore } : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: args.limit ?? 10,
  });
  return {
    items: leads.map((l) => ({
      عنوان: l.title,
      کسب_وکار: l.companyName ?? "-",
      وضعیت: l.status,
      امتیاز: l.score,
      منبع: l.source ?? "-",
    })),
  };
}

async function queryDeals(rawArgs: unknown) {
  const args = dealsArgsSchema.parse(rawArgs ?? {});
  const deals = await db.deal.findMany({
    where: {
      status: args.status,
      stage: args.stageKey ? { key: args.stageKey } : undefined,
    },
    include: { stage: true, contact: { select: { firstName: true, lastName: true } } },
    orderBy: { updatedAt: "desc" },
    take: args.limit ?? 10,
  });
  return {
    items: deals.map((d) => ({
      عنوان: d.title,
      مرحله: d.stage.name,
      مبلغ: `${Number(d.value).toLocaleString("fa-IR")} ${d.currency}`,
      وضعیت: d.status,
      مخاطب: d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "-",
    })),
  };
}

async function queryActivities(rawArgs: unknown) {
  const args = activitiesArgsSchema.parse(rawArgs ?? {});
  const since = args.sinceDays
    ? new Date(Date.now() - args.sinceDays * 86_400_000)
    : undefined;
  const activities = await db.activity.findMany({
    where: {
      kind: args.kind,
      entityType: args.entityType,
      occurredAt: since ? { gte: since } : undefined,
    },
    orderBy: { occurredAt: "desc" },
    take: args.limit ?? 10,
  });
  return {
    items: activities.map((a) => ({
      عنوان: a.title,
      نوع: a.kind,
      تاریخ: a.occurredAt.toLocaleDateString("fa-IR"),
    })),
  };
}

async function crmStats() {
  statsArgsSchema.parse({});
  const [
    leadsByStatus,
    dealsOpen,
    dealsWon,
    dealsLost,
    pipelineValue,
    wonValue,
    contactsTotal,
  ] = await Promise.all([
    db.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    db.deal.count({ where: { status: "open" } }),
    db.deal.count({ where: { status: "won" } }),
    db.deal.count({ where: { status: "lost" } }),
    db.deal.aggregate({ where: { status: "open" }, _sum: { value: true } }),
    db.deal.aggregate({ where: { status: "won" }, _sum: { value: true } }),
    db.contact.count(),
  ]);

  const leadsTotal = leadsByStatus.reduce((s, r) => s + r._count._all, 0);
  const convertedLeads = leadsByStatus.find((r) => r.status === "converted")?._count._all ?? 0;
  const conversionRate = leadsTotal > 0 ? Math.round((convertedLeads / leadsTotal) * 100) : 0;

  return {
    کل_لیدها: leadsTotal,
    لیدهای_تبدیل_شده: convertedLeads,
    نرخ_تبدیل_درصد: conversionRate,
    معاملات_باز: dealsOpen,
    معاملات_برد: dealsWon,
    معاملات_باخت: dealsLost,
    ارزش_پایپ_لاین_باز: Number(pipelineValue._sum.value ?? 0).toLocaleString("fa-IR"),
    درآمد_برد_شده: Number(wonValue._sum.value ?? 0).toLocaleString("fa-IR"),
    کل_مخاطبان: contactsTotal,
  };
}

/** Execute a tool by name. Requires an active platform context (auth gate). */
export async function executeTool(
  name: string,
  args: unknown,
): Promise<Record<string, unknown>> {
  requireContext();
  switch (name) {
    case "query_leads":
      return queryLeads(args);
    case "query_deals":
      return queryDeals(args);
    case "query_activities":
      return queryActivities(args);
    case "crm_stats":
      return crmStats();
    default:
      return { error: `ابزار ناشناخته: ${name}` };
  }
}

import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { assertTenantReference } from "@/core/tenancy/relations";

/**
 * Immigration module service — visa/permit cases with authority submissions and
 * deadlines on the shared Pipeline/Documents/Rules engines. Deadline queries
 * drive reminders; submitting a case emits an event for automations.
 */

export interface ImmigrationCaseInput {
  clientName: string;
  visaType: string;
  authority?: string | null;
  deadline?: Date | null;
  contactId?: string | null;
  customFields?: Record<string, unknown>;
}

const OPEN_STATUSES = ["intake", "preparing", "submitted", "appeal"];

export async function listCases(status?: string) {
  authorize("immigration.case.read");
  return db.immigrationCase.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
  });
}

export async function caseStats() {
  authorize("immigration.case.read");
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const [open, submitted, approved, deadlineSoon] = await Promise.all([
    db.immigrationCase.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.immigrationCase.count({ where: { status: "submitted" } }),
    db.immigrationCase.count({ where: { status: "approved" } }),
    db.immigrationCase.count({
      where: { status: { in: OPEN_STATUSES }, deadline: { lte: soon, gte: new Date() } },
    }),
  ]);
  return { open, submitted, approved, deadlineSoon };
}

async function nextReference(): Promise<string> {
  const count = await db.immigrationCase.count();
  return `IMM-${String(count + 1).padStart(4, "0")}`;
}

export async function createCase(input: ImmigrationCaseInput) {
  authorize("immigration.case.update");
  const ctx = requireContext();
  await assertTenantReference("contact", input.contactId);
  const immigrationCase = await db.immigrationCase.create({
    data: {
      tenantId: ctx.tenantId,
      reference: await nextReference(),
      clientName: input.clientName,
      visaType: input.visaType,
      authority: input.authority ?? null,
      deadline: input.deadline ?? null,
      contactId: input.contactId,
      status: "intake",
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await Promise.all([
    publish({ type: "immigration.case.created", entityType: "immigration_case", entityId: immigrationCase.id, payload: { visaType: immigrationCase.visaType } }),
    record({ category: "DATA", action: "immigration.case.create", entityType: "immigration_case", entityId: immigrationCase.id }),
    addActivity({ entityType: "immigration_case", entityId: immigrationCase.id, kind: "system", title: `Case ${immigrationCase.reference} opened` }),
  ]);
  return immigrationCase;
}

/** Cases with an approaching deadline — drives reminders. */
export async function upcomingDeadlines(days = 14) {
  authorize("immigration.case.read");
  const until = new Date();
  until.setDate(until.getDate() + days);
  return db.immigrationCase.findMany({
    where: { status: { in: OPEN_STATUSES }, deadline: { lte: until, gte: new Date() } },
    orderBy: { deadline: "asc" },
    take: 10,
  });
}

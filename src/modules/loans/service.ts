import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { assertTenantReference } from "@/core/tenancy/relations";

/**
 * Loan & Banking module service — loan applications routed to bank partners on
 * the shared Pipeline/Finance engines. Submitting an application emits an event
 * that automations/analytics can react to; approvals feed the Finance rollups.
 */

export interface LoanApplicationInput {
  applicantName: string;
  purpose: string;
  amount?: number;
  termMonths?: number;
  contactId?: string | null;
  bankPartnerId?: string | null;
  customFields?: Record<string, unknown>;
}

const OPEN_STATUSES = ["draft", "submitted", "under_review"];

export async function listLoanApplications(status?: string) {
  authorize("loans.application.read");
  return db.loanApplication.findMany({
    where: { status },
    include: { bankPartner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function loanStats() {
  authorize("loans.application.read");
  const [open, approved, disbursedAgg, pendingReview] = await Promise.all([
    db.loanApplication.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.loanApplication.count({ where: { status: "approved" } }),
    db.loanApplication.aggregate({
      where: { status: { in: ["approved", "disbursed"] } },
      _sum: { amount: true },
    }),
    db.loanApplication.count({ where: { status: "under_review" } }),
  ]);
  return {
    open,
    approved,
    financedVolume: Number(disbursedAgg._sum.amount ?? 0),
    pendingReview,
  };
}

/** Next reference number, e.g. LN-0007. */
async function nextReference(): Promise<string> {
  const count = await db.loanApplication.count();
  return `LN-${String(count + 1).padStart(4, "0")}`;
}

export async function createLoanApplication(input: LoanApplicationInput) {
  authorize("loans.application.update");
  const ctx = requireContext();
  await assertTenantReference("contact", input.contactId);
  const application = await db.loanApplication.create({
    data: {
      tenantId: ctx.tenantId,
      reference: await nextReference(),
      applicantName: input.applicantName,
      purpose: input.purpose,
      amount: new Prisma.Decimal(input.amount ?? 0),
      termMonths: input.termMonths ?? 12,
      contactId: input.contactId,
      bankPartnerId: input.bankPartnerId,
      status: "submitted",
      submittedAt: new Date(),
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await Promise.all([
    publish({
      type: "loan.submitted",
      entityType: "loan_application",
      entityId: application.id,
      payload: { purpose: application.purpose },
    }),
    record({
      category: "DATA",
      action: "loan.create",
      entityType: "loan_application",
      entityId: application.id,
    }),
    addActivity({
      entityType: "loan_application",
      entityId: application.id,
      kind: "system",
      title: `Loan application ${application.reference} submitted`,
    }),
  ]);
  return application;
}

export async function listBankPartners() {
  authorize("loans.partner.read");
  return db.bankPartner.findMany({ orderBy: { name: "asc" } });
}

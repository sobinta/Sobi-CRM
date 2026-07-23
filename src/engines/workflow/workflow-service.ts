import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { saveVersion } from "@/core/versions/version-manager";

/**
 * Workflow engine — staged processes with approvals, SLAs, and required
 * fields/documents per stage. Definitions are versioned via ConfigVersion so
 * every change is auditable and reversible.
 */

export interface WorkflowStage {
  key: string;
  name: string;
  tone: string;
  requiredFields: string[];
  requiredDocs: string[];
  approvalRoleKey?: string;
  slaHours?: number;
}

export interface WorkflowInput {
  key: string;
  name: string;
  entityType: string;
  stages: WorkflowStage[];
}

export async function listWorkflows() {
  authorize("studio.workflow.read");
  return db.workflowDefinition.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getWorkflow(key: string) {
  authorize("studio.workflow.read");
  return db.workflowDefinition.findFirst({ where: { key } });
}

export async function saveWorkflow(input: WorkflowInput) {
  authorize("studio.workflow.update");
  const ctx = requireContext();

  const existing = await db.workflowDefinition.findFirst({
    where: { key: input.key },
  });

  const wf = existing
    ? await db.workflowDefinition.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          entityType: input.entityType,
          stages: input.stages as unknown as Prisma.InputJsonValue,
        },
      })
    : await db.workflowDefinition.create({
        data: {
          tenantId: ctx.tenantId,
          key: input.key,
          name: input.name,
          entityType: input.entityType,
          stages: input.stages as unknown as Prisma.InputJsonValue,
          createdById: ctx.membershipId,
        },
      });

  // Version the definition.
  await saveVersion("workflow", wf.id, input, {
    publish: true,
    label: `Edited ${input.name}`,
  });
  await record({
    category: "ADMIN",
    action: "workflow.save",
    entityType: "workflow",
    entityId: wf.id,
  });

  return wf;
}

import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { record } from "@/core/audit/audit";
import { publish } from "@/core/event-bus/bus";
import { createTask } from "@/engines/tasks/task-service";

/**
 * AI Action Center — the human-approval gate. AI skills never write directly;
 * they create pending AiActions. Approving executes the proposal; rejecting
 * discards it. Every decision is audited (AI category).
 */

export async function listPendingActions() {
  requireContext();
  return db.aiAction.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function approveAction(id: string): Promise<{ ok: boolean }> {
  const ctx = requireContext();
  const action = await db.aiAction.findFirst({ where: { id, status: "pending" } });
  if (!action) return { ok: false };

  const proposal = action.proposal as { type?: string; title?: string; entityType?: string; entityId?: string };

  // Execute the proposal by type.
  if (proposal.type === "create_task" && proposal.title) {
    await createTask({
      title: proposal.title,
      entityType: proposal.entityType ?? null,
      entityId: proposal.entityId ?? null,
    });
  }

  await db.aiAction.update({
    where: { id },
    data: { status: "executed", decidedBy: ctx.membershipId, decidedAt: new Date() },
  });
  await Promise.all([
    record({ category: "AI", action: "ai_action.approve", entityType: "ai_action", entityId: id }),
    publish({ type: "ai.action_approved", entityType: "ai_action", entityId: id, payload: { skill: action.skill } }),
  ]);
  return { ok: true };
}

export async function rejectAction(id: string): Promise<{ ok: boolean }> {
  const ctx = requireContext();
  await db.aiAction.update({
    where: { id },
    data: { status: "rejected", decidedBy: ctx.membershipId, decidedAt: new Date() },
  });
  await record({ category: "AI", action: "ai_action.reject", entityType: "ai_action", entityId: id });
  return { ok: true };
}

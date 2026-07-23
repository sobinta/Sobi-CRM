"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { saveWorkflow, type WorkflowInput } from "@/engines/workflow/workflow-service";

export async function saveWorkflowAction(
  input: WorkflowInput,
): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || input.stages.length === 0) {
    return { ok: false };
  }
  await withActionContext(() => saveWorkflow(input), {
    permission: "studio.workflow.update",
  });
  revalidatePath("/[locale]/(app)/studio/workflows", "page");
  return { ok: true };
}

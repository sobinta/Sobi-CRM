import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listWorkflows } from "@/engines/workflow/workflow-service";
import { PageHeader } from "@/components/patterns/page-header";
import { WorkflowBuilder } from "./workflow-builder";
import type { WorkflowStage } from "@/engines/workflow/workflow-service";

export default async function WorkflowsPage() {
  const workflows = await withPlatformContext(() => listWorkflows());
  if (!workflows) notFound();

  const first = workflows[0];
  const initial = first
    ? {
        key: first.key,
        name: first.name,
        entityType: first.entityType,
        stages: (first.stages as unknown as WorkflowStage[]) ?? [],
      }
    : null;

  return (
    <div>
      <PageHeader
        title="Workflow builder"
        description="Design staged processes with required documents, approvals, and SLAs."
      />
      <WorkflowBuilder initial={initial} />
    </div>
  );
}

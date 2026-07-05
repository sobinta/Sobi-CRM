import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listAutomations } from "@/engines/automation/automation-service";
import { PageHeader } from "@/components/patterns/page-header";
import { AutomationsClient, type AutomationRow } from "./automations-client";

export default async function AutomationsPage() {
  const automations = await withPlatformContext(() => listAutomations());
  if (!automations) notFound();

  const rows: AutomationRow[] = automations.map((a) => {
    const trigger = a.trigger as { eventType?: string };
    const actions = (a.actions as Array<{ type: string }>) ?? [];
    return {
      id: a.id,
      name: a.name,
      eventType: trigger.eventType ?? "—",
      enabled: a.enabled,
      actionSummary:
        actions.length === 1
          ? actions[0].type.replace(/_/g, " ")
          : `${actions.length} actions`,
      runCount: a._count.runs,
    };
  });

  return (
    <div>
      <PageHeader
        title="Automations"
        description="When something happens, automatically do something else."
      />
      <AutomationsClient automations={rows} />
    </div>
  );
}

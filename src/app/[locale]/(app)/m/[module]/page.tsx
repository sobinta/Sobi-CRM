import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { getModule } from "@/core/module-registry/catalog";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Sparkles } from "lucide-react";

/**
 * Generic landing for activated modules that don't yet have a bespoke
 * dashboard (Insurance has its own route). Confirms the module is active and
 * describes it — the workspace is real; richer pages land per module.
 */
export default async function ModuleLanding({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const entry = getModule(module);
  if (!entry) notFound();

  const enabled = await withPlatformContext(() => isModuleEnabled(module));

  return (
    <div>
      <PageHeader title={entry.name} description={entry.description} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <EmptyState
          icon={entry.icon ?? Sparkles}
          title={enabled ? `${entry.name} is active` : `${entry.name} is not active`}
          description={
            enabled
              ? `This workspace composes the ${entry.engines.join(", ")} engines. Detailed screens for ${entry.name} build on the same shared patterns as the Insurance and CRM workspaces.`
              : "Activate this module in Administration → Modules to use it."
          }
        />
      </div>
    </div>
  );
}

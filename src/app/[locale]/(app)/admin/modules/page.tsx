import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { loadTenantFeatures, moduleFeatureKey } from "@/core/features/features";
import { MODULE_CATALOG } from "@/core/module-registry/catalog";
import { canSafe } from "@/core/rbac/permission";
import { PageHeader } from "@/components/patterns/page-header";
import { ModuleToggle } from "./module-toggle";

export default async function ModulesPage() {
  const data = await withPlatformContext(async () => {
    if (!canSafe("admin.module.update") && !canSafe("*")) {
      // Non-admins may still view; toggles are disabled server-side anyway.
    }
    const features = await loadTenantFeatures();
    return {
      enabledByKey: Object.fromEntries(
        MODULE_CATALOG.map((m) => [
          m.key,
          features.get(moduleFeatureKey(m.key)) ?? false,
        ]),
      ) as Record<string, boolean>,
    };
  });

  if (!data) notFound();

  const available = MODULE_CATALOG.filter((m) => m.status === "available");
  const planned = MODULE_CATALOG.filter((m) => m.status === "planned");

  return (
    <div>
      <PageHeader
        title="Modules"
        description="Activate the industry modules your business needs. Each adds workspaces, workflows, and dashboards."
      />
      <div className="mx-auto max-w-4xl px-6 py-6">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Available
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {available.map((m) => (
              <ModuleToggle
                key={m.key}
                moduleKey={m.key}
                initialEnabled={data.enabledByKey[m.key]}
              />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            On the roadmap
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {planned.map((m) => (
              <ModuleToggle
                key={m.key}
                moduleKey={m.key}
                initialEnabled={false}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

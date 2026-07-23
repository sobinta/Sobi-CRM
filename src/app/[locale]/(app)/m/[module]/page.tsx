import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

  const [enabled, t] = await Promise.all([
    withPlatformContext(() => isModuleEnabled(module)),
    getTranslations("moduleGeneric"),
  ]);

  return (
    <div>
      <PageHeader title={entry.name} description={entry.description} helpTopic="moduleGeneric" />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <EmptyState
          icon={entry.icon ?? Sparkles}
          title={
            enabled
              ? t("activeTitle", { name: entry.name })
              : t("inactiveTitle", { name: entry.name })
          }
          description={
            enabled
              ? t("activeDescription", { name: entry.name, engines: entry.engines.join(", ") })
              : t("inactiveDescription")
          }
        />
      </div>
    </div>
  );
}

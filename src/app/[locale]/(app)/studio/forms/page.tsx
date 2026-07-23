import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listEntities, resolveEntity } from "@/core/metadata/registry";
import { formHistory, loadEditorForm } from "@/engines/forms/service";
import { Link } from "@/i18n/navigation";
import { FeatureHelp } from "@/components/patterns/feature-help";
import { FormBuilder } from "./form-builder";
import "@/engines/crm/entities";

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const t = await getTranslations("formBuilder");
  const sp = await searchParams;
  const entityKey = sp.entity ?? "contact";
  const data = await withPlatformContext(async () => {
    const [meta, entities, form, versions] = await Promise.all([
      resolveEntity(entityKey), listEntities(), loadEditorForm(entityKey), formHistory(entityKey),
    ]);
    return { meta, entities, form, versions: versions.map((version) => ({ id: version.id, version: version.version, status: version.status, label: version.label, createdAt: version.createdAt.toISOString() })) };
  });
  if (!data || !data.meta || !data.form) notFound();

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{t("eyebrow")}</p>
          <div className="mt-1 flex items-center gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
            <FeatureHelp topicKey="forms" />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("description")}</p>
        </div>
        <nav aria-label={t("entities")} className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-raised p-1">
          {data.entities.map((entity) => <Link key={entity.key} href={`/studio/forms?entity=${entity.key}`} className={entity.key === entityKey ? "whitespace-nowrap rounded-lg bg-brand-subtle px-3 py-2 text-sm font-semibold text-brand-subtle-ink" : "whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"}>{t.has(`entitiesMap.${entity.key}`) ? t(`entitiesMap.${entity.key}`) : entity.namePlural}</Link>)}
        </nav>
      </header>
      <FormBuilder meta={data.meta} entityLabel={t.has(`entitiesMap.${data.meta.key}`) ? t(`entitiesMap.${data.meta.key}`) : data.meta.namePlural} initial={data.form} versions={data.versions} />
    </div>
  );
}

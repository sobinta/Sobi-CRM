import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { resolveEntity, listBuiltinEntities } from "@/core/metadata/registry";
import { loadForm } from "@/engines/forms/service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { FormBuilder } from "./form-builder";
import "@/engines/crm/entities"; // ensure CRM entities are registered

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const sp = await searchParams;
  const entityKey = sp.entity ?? "contact";

  const data = await withPlatformContext(async () => {
    const meta = await resolveEntity(entityKey);
    if (!meta) return null;
    const form = await loadForm(entityKey);
    return { meta, form };
  });

  if (!data || !data.form) notFound();
  const entities = listBuiltinEntities();

  return (
    <div>
      <PageHeader
        title="Form builder"
        description="Arrange fields, add conditional logic, and publish versioned forms."
      >
        <div className="flex gap-1.5 px-6 py-2">
          {entities.map((e) => (
            <Link
              key={e.key}
              href={`/studio/forms?entity=${e.key}`}
              className={
                e.key === entityKey
                  ? "rounded-md bg-brand-subtle px-2.5 py-1 text-sm font-medium text-brand-subtle-ink"
                  : "rounded-md px-2.5 py-1 text-sm text-ink-muted hover:bg-surface-sunken"
              }
            >
              {e.namePlural}
            </Link>
          ))}
        </div>
      </PageHeader>
      <div className="px-6 py-6">
        <FormBuilder meta={data.meta} initial={data.form} />
      </div>
    </div>
  );
}

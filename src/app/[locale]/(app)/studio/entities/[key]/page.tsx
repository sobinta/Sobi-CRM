import { notFound } from "next/navigation";
import { Database } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getCustomEntity, listRecords } from "@/engines/entity-builder/entity-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Link } from "@/i18n/navigation";
import { labelFor, type FieldDefinition } from "@/core/metadata/types";
import { getLocale, getTranslations } from "next-intl/server";
import { EntityRecordsClient, type ClientField } from "./entity-records-client";

function displayValue(field: FieldDefinition, value: unknown, locale: string): string {
  if (value == null || value === "") return "—";
  if (field.type === "boolean") return value ? "✓" : "—";
  if ((field.type === "select" || field.type === "multiselect") && field.options) {
    const opt = field.options.find((o) => o.value === value);
    if (opt) return labelFor(opt.label, locale);
  }
  if (field.type === "currency" || field.type === "number") return String(value);
  return String(value);
}

export default async function EntityRecordsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const [locale, t] = await Promise.all([getLocale(), getTranslations("studioEntities")]);

  const data = await withPlatformContext(async () => {
    const def = await getCustomEntity(key);
    if (!def) return null;
    const records = await listRecords(def.id);
    return { def, records };
  });

  if (!data || !data.def) notFound();
  const { def, records } = data;
  const fields = ((def.fields as unknown as FieldDefinition[]) ?? []).filter(
    (f) => !f.system && !f.archived,
  );
  const titleField =
    (def.config as { titleField?: string })?.titleField ?? fields[0]?.key ?? "";
  // Show the title field plus up to 3 more as columns.
  const columnFields = [
    ...fields.filter((f) => f.key === titleField),
    ...fields.filter((f) => f.key !== titleField),
  ].slice(0, 4);

  const clientFields: ClientField[] = fields.map((f) => ({
    key: f.key,
    label: labelFor(f.label, locale),
    type: f.type,
    required: f.required ?? false,
    options: f.options?.map((o) => ({ value: o.value, label: labelFor(o.label, locale) })),
    placeholder: f.placeholder,
  }));

  return (
    <div>
      <PageHeader
        title={def.namePlural}
        description={t("recordsCount", {
          count: records.length,
          singular: def.nameSingular.toLowerCase(),
          plural: def.namePlural.toLowerCase(),
        })}
        helpTopic="entitiesRecords"
        actions={
          <EntityRecordsClient entityKey={def.key} fields={clientFields} title={def.nameSingular} />
        }
      />
      <div className="px-6 py-4">
        <p className="mb-3 text-xs text-ink-faint">
          <Link href="/studio/entities" className="hover:text-ink-muted">
            {t("backToBuilder")}
          </Link>
        </p>
        {records.length === 0 ? (
          <EmptyState
            icon={Database}
            title={t("noRecordsTitle", { plural: def.namePlural.toLowerCase() })}
            description={t("noRecordsBody", { singular: def.nameSingular.toLowerCase() })}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  {columnFields.map((f) => (
                    <th key={f.key} className="px-4 py-2.5 text-start font-medium">
                      {labelFor(f.label, locale)}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-start font-medium">{t("createdColumn")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {records.map((rec) => {
                  const recData = (rec.data ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={rec.id} className="bg-surface-raised">
                      {columnFields.map((f, i) => (
                        <td
                          key={f.key}
                          className={
                            i === 0
                              ? "px-4 py-3 font-medium text-ink"
                              : "px-4 py-3 text-ink-muted"
                          }
                        >
                          {displayValue(f, recData[f.key], locale)}
                        </td>
                      ))}
                      <td className="px-4 py-3 tabular text-ink-faint">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

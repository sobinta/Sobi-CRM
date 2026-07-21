import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listTemplateDefinitions } from "@/core/templates/service";
import { PageHeader } from "@/components/patterns/page-header";
import { TemplatesClient, type TemplateRow } from "./templates-client";

export default async function TemplatesPage() {
  const templates = await withPlatformContext(() => listTemplateDefinitions());
  if (!templates) notFound();
  const t = await getTranslations("studioTemplates");

  const rows: TemplateRow[] = templates.map((tpl) => {
    const def = (tpl.definition ?? {}) as { subject?: string };
    const vars = Array.isArray(tpl.variables) ? (tpl.variables as string[]) : [];
    return {
      id: tpl.id,
      kind: tpl.kind,
      name: tpl.name,
      locale: tpl.locale,
      subject: def.subject ?? "",
      body: tpl.body ?? "",
      variables: vars,
    };
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <TemplatesClient templates={rows} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listIndustryTemplates } from "@/engines/industry-templates/service";
import { PageHeader } from "@/components/patterns/page-header";
import { IndustriesClient, type IndustryRow } from "./industries-client";

export default async function IndustriesPage() {
  const industries = await withPlatformContext(() => listIndustryTemplates());
  if (!industries) notFound();
  const t = await getTranslations("industries");

  const rows: IndustryRow[] = industries.map((i) => ({
    key: i.key,
    name: i.name,
    description: i.description,
    icon: i.icon,
    entityCount: i.entityCount,
    applied: i.applied,
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="industries" />
      <IndustriesClient industries={rows} />
    </div>
  );
}

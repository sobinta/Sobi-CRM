import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listLeads } from "@/engines/crm/lead-service";
import { PageHeader } from "@/components/patterns/page-header";
import { LeadsClient, type LeadRow } from "./leads-client";

export default async function LeadsPage() {
  const leads = await withPlatformContext(() => listLeads());
  if (!leads) notFound();
  const t = await getTranslations("leads");

  const rows: LeadRow[] = leads.map((l) => {
    const custom = (l.customFields ?? {}) as { message?: string };
    return {
      id: l.id,
      title: l.title,
      companyName: l.companyName,
      industry: l.industry,
      email: l.email,
      phone: l.phone,
      status: l.status,
      source: l.source,
      score: l.score,
      scoreRationale: l.scoreRationale,
      estimatedValue: l.estimatedValue ? Number(l.estimatedValue) : null,
      message: custom.message ?? null,
      createdAt: l.createdAt.toISOString(),
      contactId: l.contactId,
    };
  });

  const openCount = rows.filter((l) => l.status !== "converted").length;

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description", { count: openCount })}
        helpTopic="leads"
      />
      <LeadsClient leads={rows} />
    </div>
  );
}

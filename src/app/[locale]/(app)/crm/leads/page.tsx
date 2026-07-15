import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listLeads } from "@/engines/crm/lead-service";
import { PageHeader } from "@/components/patterns/page-header";
import { LeadsClient, type LeadRow } from "./leads-client";

export default async function LeadsPage() {
  const leads = await withPlatformContext(() => listLeads());
  if (!leads) notFound();

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    title: l.title,
    companyName: l.companyName,
    email: l.email,
    status: l.status,
    source: l.source,
    score: l.score,
    scoreRationale: l.scoreRationale,
    contactId: l.contactId,
  }));

  const openCount = rows.filter((l) => l.status !== "converted").length;

  return (
    <div>
      <PageHeader title="لیدها" description={`${openCount} لید باز`} />
      <LeadsClient leads={rows} />
    </div>
  );
}

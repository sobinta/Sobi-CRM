import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCampaigns } from "@/engines/campaigns/campaign-service";
import { SEGMENTS } from "@/engines/campaigns/segments";
import { PageHeader } from "@/components/patterns/page-header";
import { CampaignsClient, type CampaignRow } from "./campaigns-client";

export default async function CampaignsPage() {
  const campaigns = await withPlatformContext(() => listCampaigns());
  if (!campaigns) notFound();

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    segmentKey: c.segmentKey,
    status: c.status,
    recipientCount: c._count.emails,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title="کمپین‌های ایمیلی" description={`${rows.length} کمپین`} />
      <CampaignsClient
        campaigns={rows}
        segments={SEGMENTS.map((s) => ({ key: s.key, name: s.name, description: s.description }))}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCampaigns } from "@/engines/campaigns/campaign-service";
import { SEGMENTS } from "@/engines/campaigns/segments";
import { PageHeader } from "@/components/patterns/page-header";
import { CampaignsClient, type CampaignRow } from "./campaigns-client";

export default async function CampaignsPage() {
  const [campaigns, t] = await Promise.all([
    withPlatformContext(() => listCampaigns()),
    getTranslations("campaigns"),
  ]);
  if (!campaigns) notFound();

  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    segmentKey: c.segmentKey,
    status: c.status,
    recipientCount: c.recipientCount,
    sentCount: c.sentCount,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={t("count", { count: rows.length })} helpTopic="campaigns" />
      <CampaignsClient
        campaigns={rows}
        segments={SEGMENTS.map((s) => ({ key: s.key, nameKey: s.nameKey, descriptionKey: s.descriptionKey }))}
      />
    </div>
  );
}

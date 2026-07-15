import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { getCampaign } from "@/engines/campaigns/campaign-service";
import { PageHeader } from "@/components/patterns/page-header";
import { CampaignReviewClient, type CampaignEmailRow } from "./campaign-review-client";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await withPlatformContext(() => getCampaign(id));
  if (!campaign) notFound();

  const emails: CampaignEmailRow[] = campaign.emails.map((e) => ({
    id: e.id,
    toName: e.toName,
    toEmail: e.toEmail,
    context: (e.context ?? {}) as Record<string, unknown>,
    subject: e.subject,
    bodyText: e.bodyText,
    status: e.status,
    error: e.error,
  }));

  return (
    <div>
      <PageHeader title={campaign.name} />
      <CampaignReviewClient goal={campaign.goal} emails={emails} />
    </div>
  );
}

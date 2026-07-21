import { redirect } from "@/i18n/navigation";

/**
 * The Sales module reuses the CRM Campaigns manager as its single source of
 * truth — no duplicate UI. This entry just forwards there.
 */
export default async function SalesCampaignsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/crm/campaigns", locale });
}

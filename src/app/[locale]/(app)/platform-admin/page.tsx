import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import {
  listPricingPlans,
  type PlanTranslation,
} from "@/engines/platform-admin/pricing-service";
import { PageHeader } from "@/components/patterns/page-header";
import { PricingAdminClient } from "./pricing-admin-client";

export default async function PlatformAdminPricingPage() {
  const session = await resolveSession();
  if (!session?.isSuperAdmin) notFound();

  const t = await getTranslations("platformAdmin");
  const plans = await withPlatformContext(() => listPricingPlans());

  return (
    <div>
      <PageHeader title={t("pricingTitle")} description={t("pricingDesc")} helpTopic="platformAdmin" />
      <div className="mx-auto max-w-4xl px-6 py-6">
        <PricingAdminClient
          initialPlans={(plans ?? []).map((p) => ({
            id: p.id,
            key: p.key,
            order: p.order,
            recommended: p.recommended,
            isCustom: p.isCustom,
            translations: p.translations as unknown as Record<string, PlanTranslation>,
          }))}
        />
      </div>
    </div>
  );
}

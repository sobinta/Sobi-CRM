import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import { PageHeader } from "@/components/patterns/page-header";
import { BrandingAdminClient } from "./branding-admin-client";

export default async function PlatformAdminBrandingPage() {
  const session = await resolveSession();
  if (!session?.isSuperAdmin) notFound();

  const t = await getTranslations("platformAdmin");
  const assets = await getSiteAssetsPublic();

  return (
    <div>
      <PageHeader title={t("brandingTitle")} description={t("brandingDesc")} />
      <div className="mx-auto max-w-2xl px-6 py-6">
        <BrandingAdminClient
          initialLogo={assets.logo ?? ""}
          initialFavicon={assets.favicon ?? ""}
        />
      </div>
    </div>
  );
}

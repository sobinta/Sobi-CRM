import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { normalizeBranding } from "@/core/branding/brand-tokens";
import { PageHeader } from "@/components/patterns/page-header";
import { CompanyForm } from "./company-form";
import { ThemeBuilder } from "./theme-builder";

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin");
  const data = await withPlatformContext(async () => {
    const { tenantId } = requireContext();
    const tenant = await db.tenant.findFirstOrThrow({
      where: { id: tenantId },
      select: { name: true, settings: true },
    });
    const settings = (tenant.settings ?? {}) as {
      branding?: Record<string, number>;
    };
    return {
      name: tenant.name,
      branding: normalizeBranding(settings.branding),
    };
  });

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("settingsTitle")}
        description={t("settingsDesc")}
        helpTopic="settings"
      />
      <div className="mx-auto grid max-w-4xl gap-5 px-6 py-6 lg:grid-cols-2">
        <CompanyForm initialName={data.name} />
        <ThemeBuilder initial={data.branding} />
      </div>
    </div>
  );
}

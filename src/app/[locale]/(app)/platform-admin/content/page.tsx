import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { listContentOverrides } from "@/engines/platform-admin/content-service";
import { PageHeader } from "@/components/patterns/page-header";
import { ContentAdminClient } from "./content-admin-client";

export default async function PlatformAdminContentPage() {
  const session = await resolveSession();
  if (!session?.isSuperAdmin) notFound();

  const t = await getTranslations("platformAdmin");
  const overrides = await withPlatformContext(() => listContentOverrides());

  const initialValues: Record<string, string> = {};
  for (const row of overrides ?? []) {
    initialValues[`${row.locale}:${row.key}`] = row.value;
  }

  return (
    <div>
      <PageHeader title={t("contentTitle")} description={t("contentDesc")} helpTopic="platformAdmin" />
      <div className="mx-auto max-w-3xl px-6 py-6">
        <ContentAdminClient initialValues={initialValues} />
      </div>
    </div>
  );
}

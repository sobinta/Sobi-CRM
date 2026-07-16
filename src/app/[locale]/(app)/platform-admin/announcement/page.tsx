import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { getAnnouncementBar } from "@/engines/platform-admin/announcement-service";
import { PageHeader } from "@/components/patterns/page-header";
import { withPlatformContext } from "@/core/auth/with-context";
import { AnnouncementAdminClient } from "./announcement-admin-client";

export default async function PlatformAdminAnnouncementPage() {
  const session = await resolveSession();
  if (!session?.isSuperAdmin) notFound();

  const t = await getTranslations("platformAdmin");
  const row = await withPlatformContext(() => getAnnouncementBar());

  return (
    <div>
      <PageHeader
        title={t("announcementTitle")}
        description={t("announcementDesc")}
      />
      <div className="mx-auto max-w-2xl px-6 py-6">
        <AnnouncementAdminClient
          initial={{
            enabled: row?.enabled ?? false,
            translations: (row?.translations as Record<string, string>) ?? {},
            backgroundColor: row?.backgroundColor ?? "#183f3b",
            textColor: row?.textColor ?? "#ffffff",
            animation: (row?.animation as "ltr" | "rtl" | "static") ?? "static",
            linkUrl: row?.linkUrl ?? "",
          }}
        />
      </div>
    </div>
  );
}

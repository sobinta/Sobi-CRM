import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { getTenantBranding } from "@/core/branding/get-branding";
import { brandTokenCss, isCustomBranding } from "@/core/branding/brand-tokens";
import {
  getAnnouncementBarPublic,
  resolveAnnouncementText,
} from "@/engines/platform-admin/announcement-service";
import { AppShell } from "@/components/layout/app-shell";
import type { SessionUser } from "@/components/layout/session-context";
import { getTenantPlanSummary } from "@/core/billing/subscription-summary";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const session = await resolveSession();

  if (!session) {
    redirect({ href: "/login", locale });
  }
  if (!session!.active) {
    // Authenticated but no workspace yet (edge case if provisioning failed).
    redirect({ href: "/register", locale });
  }

  const s = session!;
  const workspaceData = await withPlatformContext(async () => {
    const { loadTenantFeatures } = await import("@/core/features/features");
    const { MODULE_CATALOG } = await import(
      "@/core/module-registry/catalog"
    );
    const [features, plan] = await Promise.all([
      loadTenantFeatures(),
      getTenantPlanSummary(locale),
    ]);
    const enabledModuleKeys = MODULE_CATALOG.filter(
      (m) => features.get(`module.${m.key}`) === true,
    ).map((m) => m.key);
    return { enabledModuleKeys, plan };
  });
  const branding = await getTenantBranding(s.active!.tenantId);
  const brandCss = isCustomBranding(branding)
    ? `:root{${brandTokenCss(branding)}}`
    : null;

  const announcementRow = await getAnnouncementBarPublic();
  const announcement =
    announcementRow?.enabled
      ? {
          text: resolveAnnouncementText(announcementRow.translations, locale),
          backgroundColor: announcementRow.backgroundColor,
          textColor: announcementRow.textColor,
          animation: announcementRow.animation as "ltr" | "rtl" | "static",
          linkUrl: announcementRow.linkUrl,
        }
      : null;

  const user: SessionUser = {
    name: s.name,
    email: s.email,
    initials: s.name
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    activeTenantId: s.active!.tenantId,
    tenants: s.memberships.map((m) => ({
      id: m.tenantId,
      name: m.tenantName,
    })),
    plan: workspaceData?.plan ?? {
      key: "free",
      name: "Free",
      upgradeAvailable: false,
    },
    isSuperAdmin: s.isSuperAdmin,
    accessMode: s.active!.accessMode,
  };

  return (
    <>
      {brandCss && (
        <style
          id="tenant-brand"
          dangerouslySetInnerHTML={{ __html: brandCss }}
        />
      )}
      <AppShell
        user={user}
        enabledModuleKeys={workspaceData?.enabledModuleKeys ?? []}
        announcement={announcement}
        skipLabel={
          locale === "fa"
            ? "رفتن به محتوای اصلی"
            : locale === "de"
              ? "Zum Hauptinhalt springen"
              : "Skip to main content"
        }
      >
        {children}
      </AppShell>
    </>
  );
}

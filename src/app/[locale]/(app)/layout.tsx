import type { ReactNode } from "react";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { getTenantBranding } from "@/core/branding/get-branding";
import { brandTokenCss, isCustomBranding } from "@/core/branding/brand-tokens";
import { AppShell } from "@/components/layout/app-shell";
import type { SessionUser } from "@/components/layout/session-context";
// Side-effect import: subscribes the automation + webhook engines to the bus.
import "@/engines/subscribers-bootstrap";

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
  const enabledModuleKeys = await withPlatformContext(async () => {
    const { loadTenantFeatures } = await import("@/core/features/features");
    const { MODULE_CATALOG } = await import(
      "@/core/module-registry/catalog"
    );
    const features = await loadTenantFeatures();
    return MODULE_CATALOG.filter(
      (m) => features.get(`module.${m.key}`) === true,
    ).map((m) => m.key);
  });
  const branding = await getTenantBranding(s.active!.tenantId);
  const brandCss = isCustomBranding(branding)
    ? `:root{${brandTokenCss(branding)}}`
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
    isSuperAdmin: s.isSuperAdmin,
  };

  return (
    <>
      {brandCss && (
        <style
          id="tenant-brand"
          dangerouslySetInnerHTML={{ __html: brandCss }}
        />
      )}
      <AppShell user={user} enabledModuleKeys={enabledModuleKeys ?? []}>
        {children}
      </AppShell>
    </>
  );
}

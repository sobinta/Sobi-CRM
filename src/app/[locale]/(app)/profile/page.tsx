import { notFound } from "next/navigation";
import { CreditCard, Mail, UserRound, Warehouse } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { getTenantPlanSummary } from "@/core/billing/subscription-summary";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const [session, t, locale] = await Promise.all([
    resolveSession(),
    getTranslations("account"),
    getLocale(),
  ]);
  if (!session?.active) notFound();

  const plan = await withPlatformContext(() => getTenantPlanSummary(locale));
  if (!plan) notFound();

  return (
    <div className="pb-8">
      <PageHeader title={t("profileTitle")} description={t("profileDescription")} helpTopic="profile" />
      <div className="mx-auto grid w-full max-w-4xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="h-4 w-4 text-brand" />
              {t("personalDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileValue label={t("name")} value={session.name} />
            <ProfileValue label={t("email")} value={session.email} icon={<Mail aria-hidden="true" className="h-4 w-4" />} dir="ltr" />
            <div>
              <p className="text-xs font-medium text-ink-faint">{t("workspaces")}</p>
              <ul className="mt-2 space-y-2">
                {session.memberships.map((membership) => (
                  <li key={membership.tenantId} className="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">
                    <Warehouse aria-hidden="true" className="h-4 w-4 text-ink-faint" />
                    <span className="truncate">{membership.tenantName}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card id="plan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard aria-hidden="true" className="h-4 w-4 text-brand" />
              {t("planOverview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-medium text-ink-faint">{t("activePlan")}</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{plan.name}</p>
            <p className="mt-1 font-mono text-xs text-ink-faint" dir="ltr">{plan.key}</p>
            {plan.upgradeAvailable && session.active.accessMode !== "read-only" && (
              <Link href="/billing" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-ink-on-brand transition-colors duration-(--motion-fast) hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:min-h-9">
                {t("upgradePlan")}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileValue({
  label,
  value,
  icon,
  dir,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-ink" dir={dir}>
        {icon}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

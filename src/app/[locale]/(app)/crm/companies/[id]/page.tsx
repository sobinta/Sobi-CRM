import { notFound } from "next/navigation";
import { Building2, Globe, Phone, Users, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { getCompany, getCompanyFullTimeline } from "@/engines/crm/company-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { TimelinePanel } from "@/components/patterns/timeline-panel";
import { AddActivityDialog } from "@/components/patterns/add-activity-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EditCompanyDialog } from "../companies-client";

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()} ${currency}`;
  }
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const company = await getCompany(id);
      if (!company) return null;
      const timeline = await getCompanyFullTimeline(
        id,
        company.contacts.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
      );
      return { company, timeline };
    }),
    getTranslations("companies"),
  ]);
  if (!data || !data.company) notFound();
  const { company, timeline } = data;

  return (
    <div>
      <PageHeader
        title={company.name}
        description={company.industry ?? undefined}
        helpTopic="companies"
        actions={
          <EditCompanyDialog
            company={{
              id: company.id,
              name: company.name,
              industry: company.industry,
              size: company.size,
              phone: company.phone,
              website: company.website,
            }}
          />
        }
      />
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-6">
        <p className="mb-3 text-xs text-ink-faint">
          <Link href="/crm/companies" className="hover:text-ink-muted">
            ← {t("backToCompanies")}
          </Link>
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("detailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={Building2} label={t("sizeRow")} value={company.size} />
              <Row icon={Phone} label={t("phoneRow")} value={company.phone} dir="ltr" />
              <Row icon={Globe} label={t("websiteRow")} value={company.website} dir="ltr" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-ink-muted" /> {t("contactsTitle", { count: company.contacts.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noContacts")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {company.contacts.map((c) => (
                    <li key={c.id} className="py-2">
                      <Link href={`/crm/contacts/${c.id}`} className="text-sm font-medium text-ink hover:text-brand">
                        {c.firstName} {c.lastName}
                      </Link>
                      {c.jobTitle && <span className="ms-2 text-xs text-ink-muted">{c.jobTitle}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-ink-muted" /> {t("dealsTitle", { count: company.deals.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.deals.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noDeals")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {company.deals.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate text-sm text-ink">{d.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tabular text-xs text-ink-muted">{money(Number(d.value), d.currency)}</span>
                        <Chip tone="neutral">{d.stage.name}</Chip>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>{t("timelineTitle")}</CardTitle>
              <p className="mt-0.5 text-xs text-ink-faint">{t("timelineHint")}</p>
            </div>
            <AddActivityDialog entityType="company" entityId={company.id} />
          </CardHeader>
          <CardContent>
            <TimelinePanel items={timeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof Building2;
  label: string;
  value?: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
      <span className="w-16 shrink-0 text-ink-faint">{label}</span>
      <span className="truncate text-ink" dir={dir}>
        {value || "—"}
      </span>
    </div>
  );
}

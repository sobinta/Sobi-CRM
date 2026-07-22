import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCompanies } from "@/engines/crm/company-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { CompaniesToolbar, CompaniesSearch } from "./companies-client";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const [data, t] = await Promise.all([
    withPlatformContext(() => listCompanies({ search: sp.q })),
    getTranslations("companies"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description", { count: data.total })}
        helpTopic="companies"
        actions={<CompaniesToolbar />}
      >
        <div className="px-4 py-3 sm:px-6">
          <CompaniesSearch initial={sp.q ?? ""} />
        </div>
      </PageHeader>
      <div className="px-4 py-4 sm:px-6">
        {data.rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("noCompanies")}
            description={t("noCompaniesDescription")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("columnCompany")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("columnIndustry")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("columnContacts")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("columnDeals")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((c) => (
                  <tr key={c.id} className="bg-surface-raised transition-colors hover:bg-surface-sunken/50">
                    <td className="px-4 py-3">
                      <Link href={`/crm/companies/${c.id}`} className="flex items-center gap-2.5 font-medium text-ink hover:text-brand">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        <span className="whitespace-nowrap">{c.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{c.industry ?? t("noValue")}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{c._count.contacts}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{c._count.deals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

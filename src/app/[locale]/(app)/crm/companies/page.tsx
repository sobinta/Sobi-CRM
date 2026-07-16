import { notFound } from "next/navigation";
import { Building2 } from "lucide-react";
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
  const data = await withPlatformContext(() => listCompanies({ search: sp.q }));
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="شرکت‌ها"
        description={`${data.total} شرکت`}
        actions={<CompaniesToolbar />}
      >
        <div className="px-6 py-3">
          <CompaniesSearch initial={sp.q ?? ""} />
        </div>
      </PageHeader>
      <div className="px-6 py-4">
        {data.rows.length === 0 ? (
          <EmptyState icon={Building2} title="شرکتی یافت نشد" description="اولین شرکت را اضافه کنید یا از تبدیل لید بسازید." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">شرکت</th>
                  <th className="px-4 py-2.5 text-start font-medium">صنعت</th>
                  <th className="px-4 py-2.5 text-start font-medium">مخاطبان</th>
                  <th className="px-4 py-2.5 text-start font-medium">معاملات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((c) => (
                  <tr key={c.id} className="bg-surface-raised transition-colors hover:bg-surface-sunken/50">
                    <td className="px-4 py-3">
                      <Link href={`/crm/companies/${c.id}`} className="flex items-center gap-2.5 font-medium text-ink hover:text-brand">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                          <Building2 className="h-3.5 w-3.5" />
                        </span>
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.industry ?? "—"}</td>
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

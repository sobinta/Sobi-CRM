import { notFound } from "next/navigation";
import { Building2, Globe, Phone, Users, Handshake } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getCompany } from "@/engines/crm/company-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

function money(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n);
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await withPlatformContext(() => getCompany(id));
  if (!company) notFound();

  return (
    <div>
      <PageHeader title={company.name} description={company.industry ?? undefined} />
      <div className="mx-auto grid max-w-5xl gap-5 px-6 py-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات شرکت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={Building2} label="اندازه" value={company.size} />
            <Row icon={Phone} label="تلفن" value={company.phone} dir="ltr" />
            <Row icon={Globe} label="وب‌سایت" value={company.website} dir="ltr" />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4 text-ink-muted" /> مخاطبان ({company.contacts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-ink-faint">مخاطبی ثبت نشده.</p>
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
                <Handshake className="h-4 w-4 text-ink-muted" /> معاملات ({company.deals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.deals.length === 0 ? (
                <p className="text-sm text-ink-faint">معامله‌ای ثبت نشده.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {company.deals.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-ink">{d.title}</span>
                      <span className="flex items-center gap-2">
                        <span className="tabular text-xs text-ink-muted">{money(Number(d.value))} تومان</span>
                        <Chip tone="neutral">{d.stage.name}</Chip>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, dir }: { icon: typeof Building2; label: string; value?: string | null; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
      <span className="w-16 shrink-0 text-ink-faint">{label}</span>
      <span className="truncate text-ink" dir={dir}>{value || "—"}</span>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listContacts } from "@/engines/crm/contact-service";
import { contactEntity } from "@/engines/crm/entities";
import { resolveOptionChip } from "@/engines/crm/field-chips";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip } from "@/components/ui/chip";
import { ContactsToolbar } from "./contacts-toolbar";
import { getLocale, getTranslations } from "next-intl/server";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const [data, locale, t] = await Promise.all([
    withPlatformContext(() =>
      listContacts({
        search: sp.q,
        page: sp.page ? Number(sp.page) : 1,
      }),
    ),
    getLocale(),
    getTranslations("businessForms"),
  ]);
  if (!data) notFound();

  const { rows, total, page, pageSize } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title={t("contacts")}
        description={t("contactCount", { count: total })}
      >
        <ContactsToolbar />
      </PageHeader>

      <div className="px-6 py-4">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noContacts")}
            description={t("noContactsDescription")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("name")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("email")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("company")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">
                    {t("lifecycle")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const chip = resolveOptionChip(
                    contactEntity,
                    "lifecycle",
                    c.lifecycle,
                    locale,
                  );
                  return (
                    <tr
                      key={c.id}
                      className="bg-surface-raised transition-colors hover:bg-surface-sunken/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/contacts/${c.id}`}
                          className="flex items-center gap-2.5 font-medium text-ink hover:text-brand"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-semibold text-brand-subtle-ink">
                            {(c.firstName[0] ?? "") + (c.lastName[0] ?? "")}
                          </span>
                          {c.firstName} {c.lastName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-muted" dir="ltr">
                        {c.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">
                        {c.company?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={chip.tone}>{chip.label}</Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
            <span>
              {t("pageOf", { page, total: totalPages })}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/crm/contacts?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page - 1) })}`}
                  className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-sunken"
                >
                  {t("previous")}
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/crm/contacts?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page + 1) })}`}
                  className="rounded-md border border-line px-3 py-1.5 hover:bg-surface-sunken"
                >
                  {t("next")}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

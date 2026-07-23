import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { list } from "@/core/audit/audit";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";

const categoryTone: Record<string, ChipProps["tone"]> = {
  AUTH: "info",
  DATA: "neutral",
  FILE: "neutral",
  PERMISSION: "warning",
  EXPORT: "accent",
  ADMIN: "brand",
  SECURITY: "danger",
  AI: "accent",
};

const categoryKey: Record<string, string> = {
  AUTH: "categoryAuth",
  DATA: "categoryData",
  FILE: "categoryFile",
  PERMISSION: "categoryPermission",
  EXPORT: "categoryExport",
  ADMIN: "categoryAdmin",
  SECURITY: "categorySecurity",
  AI: "categoryAi",
};

export default async function AuditPage() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => list({ take: 100 })),
    getTranslations("admin"),
  ]);

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("auditTitle")}
        description={t("auditDesc")}
        helpTopic="audit"
      />
      <div className="mx-auto max-w-5xl px-6 py-6">
        {data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={t("noAuditTitle")}
            description={t("noAuditBody")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colWhen")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">
                    {t("colCategory")}
                  </th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colAction")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colActor")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colEntity")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((row) => (
                  <tr key={row.id} className="bg-surface-raised">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular text-ink-muted">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <Chip tone={categoryTone[row.category] ?? "neutral"}>
                        {categoryKey[row.category] ? t(categoryKey[row.category] as never) : row.category}
                      </Chip>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-[12px] text-ink">
                        {row.action}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {row.actorLabel ?? row.actorId ?? t("systemActor")}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {row.entityType
                        ? `${row.entityType}${row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}`
                        : "—"}
                    </td>
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

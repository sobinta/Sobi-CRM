import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export default async function RolesPage() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const roles = await db.role.findMany({
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: {
          permissions: { select: { permission: true } },
          _count: { select: { members: true } },
        },
      });
      return { roles };
    }),
    getTranslations("admin"),
  ]);

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("rolesTitle")}
        description={t("rolesDesc")}
        helpTopic="roles"
      />
      <div className="mx-auto max-w-4xl space-y-3 px-6 py-6">
        {data.roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    {role.name}
                  </h3>
                  {role.isAdmin && <Chip tone="brand">{t("adminChip")}</Chip>}
                  {role.isSystem && (
                    <Chip tone="neutral" dot={false}>
                      {t("systemChip")}
                    </Chip>
                  )}
                  <span className="text-xs text-ink-faint">
                    {t("memberCount", { count: role._count.members })}
                  </span>
                </div>
                {role.description && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {role.description}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 8).map((p) => (
                    <code
                      key={p.permission}
                      className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted"
                    >
                      {p.permission}
                    </code>
                  ))}
                  {role.permissions.length > 8 && (
                    <span className="text-[11px] text-ink-faint">
                      {t("moreCount", { count: role.permissions.length - 8 })}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

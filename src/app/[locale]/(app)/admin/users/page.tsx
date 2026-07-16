import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";

const statusTone: Record<string, ChipProps["tone"]> = {
  ACTIVE: "positive",
  INVITED: "warning",
  SUSPENDED: "danger",
};

const kindLabel: Record<string, string> = {
  INTERNAL: "Staff",
  EXTERNAL: "External",
  CLIENT: "Client",
};

export default async function UsersPage() {
  const data = await withPlatformContext(async () => {
    const members = await db.membership.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
        roles: { include: { role: { select: { name: true } } } },
      },
    });
    return { members };
  });

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="Users & teams"
        description="People with access to this workspace and their roles."
      />
      <div className="mx-auto max-w-4xl px-6 py-6">
        {data.members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Invite colleagues to collaborate in this workspace."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Member</th>
                  <th className="px-4 py-2.5 text-start font-medium">Type</th>
                  <th className="px-4 py-2.5 text-start font-medium">Roles</th>
                  <th className="px-4 py-2.5 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.members.map((m) => (
                  <tr key={m.id} className="bg-surface-raised">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-subtle-ink">
                          {m.user.name
                            .split(/\s+/)
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {m.user.name}
                          </p>
                          <p className="truncate text-xs text-ink-muted" dir="ltr">
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {kindLabel[m.kind] ?? m.kind}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.roles.map((r) => (
                          <Chip key={r.id} tone="neutral" dot={false}>
                            {r.role.name}
                          </Chip>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[m.status] ?? "neutral"}>
                        {m.status}
                      </Chip>
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

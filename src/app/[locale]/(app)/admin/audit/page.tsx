import { notFound } from "next/navigation";
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

export default async function AuditPage() {
  const data = await withPlatformContext(async () => {
    return list({ take: 100 });
  });

  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="A record of security-relevant actions across the workspace."
      />
      <div className="mx-auto max-w-5xl px-6 py-6">
        {data.items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit entries yet"
            description="Sign-ins, permission changes, exports, and admin actions will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">When</th>
                  <th className="px-4 py-2.5 text-start font-medium">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-start font-medium">Action</th>
                  <th className="px-4 py-2.5 text-start font-medium">Actor</th>
                  <th className="px-4 py-2.5 text-start font-medium">Entity</th>
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
                        {row.category}
                      </Chip>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-[12px] text-ink">
                        {row.action}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {row.actorLabel ?? row.actorId ?? "System"}
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

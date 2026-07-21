import { notFound } from "next/navigation";
import { Plane } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCases } from "@/modules/immigration/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewCaseButton } from "./cases-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  intake: "neutral",
  preparing: "info",
  submitted: "warning",
  approved: "positive",
  rejected: "danger",
  appeal: "brand",
};

export default async function CasesPage() {
  const cases = await withPlatformContext(() => listCases());
  if (!cases) notFound();

  return (
    <div>
      <PageHeader
        title="Cases"
        description={`${cases.length} ${cases.length === 1 ? "case" : "cases"}`}
        actions={<NewCaseButton />}
      />
      <div className="px-6 py-4">
        {cases.length === 0 ? (
          <EmptyState icon={Plane} title="No cases yet" description="Open your first case to track submissions and deadlines." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Reference</th>
                  <th className="px-4 py-2.5 text-start font-medium">Client</th>
                  <th className="px-4 py-2.5 text-start font-medium">Visa type</th>
                  <th className="px-4 py-2.5 text-start font-medium">Authority</th>
                  <th className="px-4 py-2.5 text-start font-medium">Deadline</th>
                  <th className="px-4 py-2.5 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cases.map((c) => (
                  <tr key={c.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{c.reference}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.clientName}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">{c.visaType}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.authority ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3"><Chip tone={statusTone[c.status] ?? "neutral"}>{c.status}</Chip></td>
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

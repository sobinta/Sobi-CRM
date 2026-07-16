import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listPolicies } from "@/modules/insurance/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewPolicyButton } from "./policies-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  active: "positive",
  lapsed: "warning",
  cancelled: "danger",
  renewed: "brand",
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function PoliciesPage() {
  const policies = await withPlatformContext(() => listPolicies());
  if (!policies) notFound();

  return (
    <div>
      <PageHeader
        title="Policies"
        description={`${policies.length} ${policies.length === 1 ? "policy" : "policies"}`}
        actions={<NewPolicyButton />}
      />
      <div className="px-6 py-4">
        {policies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No policies yet"
            description="Create your first policy to track premiums, renewals, and commissions."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Policy</th>
                  <th className="px-4 py-2.5 text-start font-medium">Product</th>
                  <th className="px-4 py-2.5 text-start font-medium">Premium</th>
                  <th className="px-4 py-2.5 text-start font-medium">Expires</th>
                  <th className="px-4 py-2.5 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {policies.map((p) => (
                  <tr key={p.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-medium text-ink font-mono text-xs">{p.policyNumber}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">{p.product}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{money(Number(p.premium))}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[p.status] ?? "neutral"}>{p.status}</Chip>
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

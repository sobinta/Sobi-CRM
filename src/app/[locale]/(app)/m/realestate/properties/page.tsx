import { notFound } from "next/navigation";
import { Home } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listProperties } from "@/modules/realestate/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewPropertyButton } from "./properties-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  available: "positive",
  reserved: "warning",
  sold: "brand",
  withdrawn: "neutral",
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function PropertiesPage() {
  const properties = await withPlatformContext(() => listProperties());
  if (!properties) notFound();

  return (
    <div>
      <PageHeader
        title="Properties"
        description={`${properties.length} ${properties.length === 1 ? "property" : "properties"}`}
        actions={<NewPropertyButton />}
      />
      <div className="px-6 py-4">
        {properties.length === 0 ? (
          <EmptyState icon={Home} title="No properties yet" description="List your first property to track viewings and offers." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Property</th>
                  <th className="px-4 py-2.5 text-start font-medium">Type</th>
                  <th className="px-4 py-2.5 text-start font-medium">Price</th>
                  <th className="px-4 py-2.5 text-start font-medium">Viewings</th>
                  <th className="px-4 py-2.5 text-start font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {properties.map((p) => (
                  <tr key={p.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-medium text-ink">{p.title}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">{p.propertyType}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{money(Number(p.price))}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{p._count.viewings}</td>
                    <td className="px-4 py-3"><Chip tone={statusTone[p.status] ?? "neutral"}>{p.status}</Chip></td>
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

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

const statusKey: Record<string, string> = {
  available: "statusAvailable",
  reserved: "statusReserved",
  sold: "statusSold",
  withdrawn: "statusWithdrawn",
};

const typeKey: Record<string, string> = {
  apartment: "typeApartment",
  house: "typeHouse",
  commercial: "typeCommercial",
  land: "typeLand",
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function PropertiesPage() {
  const [properties, t] = await Promise.all([
    withPlatformContext(() => listProperties()),
    getTranslations("moduleRealestate"),
  ]);
  if (!properties) notFound();

  return (
    <div>
      <PageHeader
        title={t("propertiesTitle")}
        description={t("propertyCount", { count: properties.length })}
        helpTopic="moduleRealestate"
        actions={<NewPropertyButton />}
      />
      <div className="px-6 py-4">
        {properties.length === 0 ? (
          <EmptyState icon={Home} title={t("noPropertiesTitle")} description={t("noPropertiesBody")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colProperty")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colType")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colPrice")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colViewings")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {properties.map((p) => (
                  <tr key={p.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-medium text-ink">{p.title}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">
                      {typeKey[p.propertyType] ? t(typeKey[p.propertyType] as never) : p.propertyType}
                    </td>
                    <td className="px-4 py-3 tabular text-ink-muted">{money(Number(p.price))}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{p._count.viewings}</td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[p.status] ?? "neutral"}>
                        {statusKey[p.status] ? t(statusKey[p.status] as never) : p.status}
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

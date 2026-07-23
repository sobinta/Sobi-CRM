import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listSalonServices } from "@/modules/salon/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { ServicesTable } from "../../_booking/booking-tables";
import { ServiceDialog } from "../../_booking/service-dialog";
import { createSalonServiceAction } from "../actions";

export default async function SalonServicesPage() {
  const [services, t] = await Promise.all([
    withPlatformContext(() => listSalonServices()),
    getTranslations("moduleSalon"),
  ]);
  if (!services) notFound();

  return (
    <div>
      <PageHeader
        title={t("treatmentsPageTitle")}
        description={t("treatmentCount", { count: services.length })}
        helpTopic="moduleSalon"
        actions={<ServiceDialog action={createSalonServiceAction} />}
      />
      <div className="px-6 py-4">
        {services.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("noTreatmentsTitle")} description={t("noTreatmentsBody")} />
        ) : (
          <ServicesTable rows={services} />
        )}
      </div>
    </div>
  );
}

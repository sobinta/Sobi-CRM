import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listBarberServices } from "@/modules/barber/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { ServicesTable } from "../../_booking/booking-tables";
import { ServiceDialog } from "../../_booking/service-dialog";
import { createBarberServiceAction } from "../actions";

export default async function BarberServicesPage() {
  const [services, t] = await Promise.all([
    withPlatformContext(() => listBarberServices()),
    getTranslations("moduleBarber"),
  ]);
  if (!services) notFound();

  return (
    <div>
      <PageHeader
        title={t("servicesPageTitle")}
        description={t("serviceCount", { count: services.length })}
        helpTopic="moduleBarber"
        actions={<ServiceDialog action={createBarberServiceAction} />}
      />
      <div className="px-6 py-4">
        {services.length === 0 ? (
          <EmptyState icon={Sparkles} title={t("noServicesTitle")} description={t("noServicesBody")} />
        ) : (
          <ServicesTable rows={services} />
        )}
      </div>
    </div>
  );
}

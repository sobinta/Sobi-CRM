import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listBarberServices } from "@/modules/barber/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { ServicesTable } from "../../_booking/booking-tables";
import { ServiceDialog } from "../../_booking/service-dialog";
import { createBarberServiceAction } from "../actions";

export default async function BarberServicesPage() {
  const services = await withPlatformContext(() => listBarberServices());
  if (!services) notFound();

  return (
    <div>
      <PageHeader
        title="Services"
        description={`${services.length} ${services.length === 1 ? "service" : "services"}`}
        actions={<ServiceDialog action={createBarberServiceAction} />}
      />
      <div className="px-6 py-4">
        {services.length === 0 ? (
          <EmptyState icon={Sparkles} title="No services yet" description="Add the services your shop offers so they can be booked." />
        ) : (
          <ServicesTable rows={services} />
        )}
      </div>
    </div>
  );
}

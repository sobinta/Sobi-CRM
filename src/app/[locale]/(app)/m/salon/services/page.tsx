import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listSalonServices } from "@/modules/salon/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { ServicesTable } from "../../_booking/booking-tables";
import { ServiceDialog } from "../../_booking/service-dialog";
import { createSalonServiceAction } from "../actions";

export default async function SalonServicesPage() {
  const services = await withPlatformContext(() => listSalonServices());
  if (!services) notFound();

  return (
    <div>
      <PageHeader
        title="Treatments"
        description={`${services.length} ${services.length === 1 ? "treatment" : "treatments"}`}
        actions={<ServiceDialog action={createSalonServiceAction} />}
      />
      <div className="px-6 py-4">
        {services.length === 0 ? (
          <EmptyState icon={Sparkles} title="No treatments yet" description="Add the treatments your salon offers so they can be booked." />
        ) : (
          <ServicesTable rows={services} />
        )}
      </div>
    </div>
  );
}

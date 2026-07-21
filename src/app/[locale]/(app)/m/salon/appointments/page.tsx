import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listSalonAppointments, listSalonServices } from "@/modules/salon/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createSalonAppointmentAction } from "../actions";

export default async function SalonAppointmentsPage() {
  const data = await withPlatformContext(async () => {
    const [appointments, services] = await Promise.all([
      listSalonAppointments(),
      listSalonServices(),
    ]);
    return { appointments, services };
  });
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="Appointments"
        description={`${data.appointments.length} total`}
        actions={
          <AppointmentDialog
            services={data.services.map((s) => ({ id: s.id, name: s.name }))}
            action={createSalonAppointmentAction}
            triggerLabel="New appointment"
            title="New appointment"
          />
        }
      />
      <div className="px-6 py-4">
        {data.appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No appointments yet" description="Book the first treatment appointment." />
        ) : (
          <AppointmentsTable rows={data.appointments} />
        )}
      </div>
    </div>
  );
}

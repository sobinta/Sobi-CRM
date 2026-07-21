import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listBarberAppointments, listBarberServices } from "@/modules/barber/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createBarberAppointmentAction } from "../actions";

export default async function BarberAppointmentsPage() {
  const data = await withPlatformContext(async () => {
    const [appointments, services] = await Promise.all([
      listBarberAppointments(),
      listBarberServices(),
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
            action={createBarberAppointmentAction}
            triggerLabel="New appointment"
            title="New appointment"
          />
        }
      />
      <div className="px-6 py-4">
        {data.appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No appointments yet" description="Book the first appointment to fill the chair schedule." />
        ) : (
          <AppointmentsTable rows={data.appointments} />
        )}
      </div>
    </div>
  );
}

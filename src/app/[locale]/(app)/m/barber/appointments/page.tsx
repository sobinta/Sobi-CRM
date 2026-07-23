import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listBarberAppointments, listBarberServices } from "@/modules/barber/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createBarberAppointmentAction } from "../actions";

export default async function BarberAppointmentsPage() {
  const [data, t, tBarber] = await Promise.all([
    withPlatformContext(async () => {
      const [appointments, services] = await Promise.all([
        listBarberAppointments(),
        listBarberServices(),
      ]);
      return { appointments, services };
    }),
    getTranslations("bookingModules"),
    getTranslations("moduleBarber"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("appointmentsTitle")}
        description={t("totalCount", { count: data.appointments.length })}
        helpTopic="moduleBarber"
        actions={
          <AppointmentDialog
            services={data.services.map((s) => ({ id: s.id, name: s.name }))}
            action={createBarberAppointmentAction}
            triggerLabel={t("newAppointment")}
            title={t("newAppointment")}
          />
        }
      />
      <div className="px-6 py-4">
        {data.appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("noAppointmentsTitle")} description={tBarber("noAppointmentsBody")} />
        ) : (
          <AppointmentsTable rows={data.appointments} />
        )}
      </div>
    </div>
  );
}

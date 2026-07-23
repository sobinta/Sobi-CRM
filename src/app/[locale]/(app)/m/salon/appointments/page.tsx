import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listSalonAppointments, listSalonServices } from "@/modules/salon/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createSalonAppointmentAction } from "../actions";

export default async function SalonAppointmentsPage() {
  const [data, t, tSalon] = await Promise.all([
    withPlatformContext(async () => {
      const [appointments, services] = await Promise.all([
        listSalonAppointments(),
        listSalonServices(),
      ]);
      return { appointments, services };
    }),
    getTranslations("bookingModules"),
    getTranslations("moduleSalon"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("appointmentsTitle")}
        description={t("totalCount", { count: data.appointments.length })}
        helpTopic="moduleSalon"
        actions={
          <AppointmentDialog
            services={data.services.map((s) => ({ id: s.id, name: s.name }))}
            action={createSalonAppointmentAction}
            triggerLabel={t("newAppointment")}
            title={t("newAppointment")}
          />
        }
      />
      <div className="px-6 py-4">
        {data.appointments.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("noAppointmentsTitle")} description={tSalon("noAppointmentsBody")} />
        ) : (
          <AppointmentsTable rows={data.appointments} />
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UtensilsCrossed } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listReservations } from "@/modules/restaurant/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createReservationAction } from "../actions";

export default async function ReservationsPage() {
  const [reservations, t, tBooking] = await Promise.all([
    withPlatformContext(() => listReservations()),
    getTranslations("moduleRestaurant"),
    getTranslations("bookingModules"),
  ]);
  if (!reservations) notFound();

  return (
    <div>
      <PageHeader
        title={t("reservationsTitle")}
        description={tBooking("totalCount", { count: reservations.length })}
        helpTopic="moduleRestaurant"
        actions={
          <AppointmentDialog
            services={[]}
            action={createReservationAction}
            triggerLabel={t("newReservation")}
            title={t("newReservation")}
            customerLabel={t("guestName")}
            showPartySize
          />
        }
      />
      <div className="px-6 py-4">
        {reservations.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} title={t("noReservationsTitle")} description={t("noReservationsBody")} />
        ) : (
          <AppointmentsTable rows={reservations} showParty />
        )}
      </div>
    </div>
  );
}

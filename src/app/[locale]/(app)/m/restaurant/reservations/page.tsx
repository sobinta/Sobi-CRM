import { notFound } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listReservations } from "@/modules/restaurant/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { AppointmentsTable } from "../../_booking/booking-tables";
import { AppointmentDialog } from "../../_booking/appointment-dialog";
import { createReservationAction } from "../actions";

export default async function ReservationsPage() {
  const reservations = await withPlatformContext(() => listReservations());
  if (!reservations) notFound();

  return (
    <div>
      <PageHeader
        title="Reservations"
        description={`${reservations.length} total`}
        actions={
          <AppointmentDialog
            services={[]}
            action={createReservationAction}
            triggerLabel="New reservation"
            title="New reservation"
            customerLabel="Guest name"
            showPartySize
          />
        }
      />
      <div className="px-6 py-4">
        {reservations.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} title="No reservations yet" description="Take the first table reservation." />
        ) : (
          <AppointmentsTable rows={reservations} showParty />
        )}
      </div>
    </div>
  );
}

import { authorize } from "@/core/rbac/guard";
import * as booking from "@/modules/_shared/booking";

/**
 * Restaurant module — table reservations (Booking-engine appointments with a
 * party size) and the service/table catalog.
 */

const KEY = "restaurant";

export async function restaurantStats() {
  authorize("restaurant.reservation.read");
  return booking.bookingStats(KEY);
}

export async function listReservations() {
  authorize("restaurant.reservation.read");
  return booking.listAppointments(KEY);
}

export async function createReservation(input: booking.AppointmentInput) {
  authorize("restaurant.reservation.update");
  return booking.createAppointment(KEY, input);
}

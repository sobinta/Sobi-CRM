import { authorize } from "@/core/rbac/guard";
import * as booking from "@/modules/_shared/booking";

/** Beauty Salon module — treatments, staff, and appointments via the Booking engine. */

const KEY = "salon";

export async function salonStats() {
  authorize("salon.appointment.read");
  return booking.bookingStats(KEY);
}

export async function listSalonAppointments() {
  authorize("salon.appointment.read");
  return booking.listAppointments(KEY);
}

export async function listSalonServices() {
  authorize("salon.appointment.read");
  return booking.listServices(KEY);
}

export async function createSalonAppointment(input: booking.AppointmentInput) {
  authorize("salon.appointment.update");
  return booking.createAppointment(KEY, input);
}

export async function createSalonService(input: booking.ServiceInput) {
  authorize("salon.appointment.update");
  return booking.createService(KEY, input);
}

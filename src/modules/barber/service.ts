import { authorize } from "@/core/rbac/guard";
import * as booking from "@/modules/_shared/booking";

/** Barber Shop module — services, staff, and appointments via the Booking engine. */

const KEY = "barber";

export async function barberStats() {
  authorize("barber.appointment.read");
  return booking.bookingStats(KEY);
}

export async function listBarberAppointments() {
  authorize("barber.appointment.read");
  return booking.listAppointments(KEY);
}

export async function listBarberServices() {
  authorize("barber.appointment.read");
  return booking.listServices(KEY);
}

export async function createBarberAppointment(input: booking.AppointmentInput) {
  authorize("barber.appointment.update");
  return booking.createAppointment(KEY, input);
}

export async function createBarberService(input: booking.ServiceInput) {
  authorize("barber.appointment.update");
  return booking.createService(KEY, input);
}

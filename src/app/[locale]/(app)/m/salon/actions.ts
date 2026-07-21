"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createSalonAppointment, createSalonService } from "@/modules/salon/service";

const apptSchema = z.object({
  customerName: z.string().trim().min(1),
  serviceId: z.string().optional(),
  startAt: z.string().min(1),
});

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  durationMin: z.coerce.number().int().min(5).optional(),
  price: z.coerce.number().min(0).optional(),
});

export async function createSalonAppointmentAction(input: unknown) {
  const parsed = apptSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createSalonAppointment({
      customerName: parsed.data.customerName,
      serviceId: parsed.data.serviceId || null,
      startAt: new Date(parsed.data.startAt),
    }),
  );
  revalidatePath("/[locale]/(app)/m/salon/appointments", "page");
  return { ok: true as const };
}

export async function createSalonServiceAction(input: unknown) {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createSalonService({
      name: parsed.data.name,
      durationMin: parsed.data.durationMin,
      price: parsed.data.price,
    }),
  );
  revalidatePath("/[locale]/(app)/m/salon/services", "page");
  return { ok: true as const };
}

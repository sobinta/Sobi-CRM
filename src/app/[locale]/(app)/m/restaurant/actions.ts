"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createReservation } from "@/modules/restaurant/service";

const schema = z.object({
  customerName: z.string().trim().min(1),
  startAt: z.string().min(1),
  partySize: z.coerce.number().int().min(1).optional(),
});

export async function createReservationAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createReservation({
      customerName: parsed.data.customerName,
      startAt: new Date(parsed.data.startAt),
      partySize: parsed.data.partySize ?? null,
    }),
  );
  revalidatePath("/[locale]/(app)/m/restaurant/reservations", "page");
  return { ok: true as const };
}

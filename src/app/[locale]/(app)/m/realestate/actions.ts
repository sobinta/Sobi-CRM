"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createProperty } from "@/modules/realestate/service";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const schema = z.object({
  title: z.string().trim().min(1),
  propertyType: z.string().min(1),
  price: z.coerce.number().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  address: z.string().trim().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createPropertyAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(async () =>
    createProperty({
      title: parsed.data.title,
      propertyType: parsed.data.propertyType,
      price: parsed.data.price,
      bedrooms: parsed.data.bedrooms ?? null,
      address: parsed.data.address || null,
      customFields: await validatePublishedCustomFields("property", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/m/realestate/properties", "page");
  return { ok: true as const };
}

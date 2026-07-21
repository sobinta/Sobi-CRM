"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createPolicy } from "@/modules/insurance/service";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const schema = z.object({
  policyNumber: z.string().trim().min(1),
  product: z.string().min(1),
  premium: z.coerce.number().min(0).optional(),
  commission: z.coerce.number().min(0).optional(),
  expiresAt: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createPolicyAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(async () =>
    createPolicy({
      policyNumber: parsed.data.policyNumber,
      product: parsed.data.product,
      premium: parsed.data.premium,
      commission: parsed.data.commission,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      customFields: await validatePublishedCustomFields("policy", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/m/insurance/policies", "page");
  return { ok: true as const };
}

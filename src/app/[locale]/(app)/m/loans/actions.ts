"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createLoanApplication } from "@/modules/loans/service";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const schema = z.object({
  applicantName: z.string().trim().min(1),
  purpose: z.string().min(1),
  amount: z.coerce.number().min(0).optional(),
  termMonths: z.coerce.number().int().min(1).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createLoanApplicationAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(async () =>
    createLoanApplication({
      applicantName: parsed.data.applicantName,
      purpose: parsed.data.purpose,
      amount: parsed.data.amount,
      termMonths: parsed.data.termMonths,
      customFields: await validatePublishedCustomFields(
        "loan_application",
        parsed.data.customFields,
      ),
    }),
  );
  revalidatePath("/[locale]/(app)/m/loans/applications", "page");
  return { ok: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createCase } from "@/modules/immigration/service";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const schema = z.object({
  clientName: z.string().trim().min(1),
  visaType: z.string().min(1),
  authority: z.string().trim().optional(),
  deadline: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createCaseAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(async () =>
    createCase({
      clientName: parsed.data.clientName,
      visaType: parsed.data.visaType,
      authority: parsed.data.authority || null,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      customFields: await validatePublishedCustomFields("immigration_case", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/m/immigration/cases", "page");
  return { ok: true as const };
}

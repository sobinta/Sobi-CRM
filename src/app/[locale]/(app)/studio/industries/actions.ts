"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { applyIndustryTemplate } from "@/engines/industry-templates/service";

const schema = z.object({ key: z.string().min(1) });

export async function applyIndustryAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const res = await withActionContext(() =>
    applyIndustryTemplate(parsed.data.key),
  );
  revalidatePath("/[locale]/(app)/studio/industries", "page");
  return {
    ok: res.ok,
    entitiesCreated: res.entitiesCreated,
    recordsCreated: res.recordsCreated,
  };
}

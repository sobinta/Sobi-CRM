"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createRecordByKey } from "@/engines/entity-builder/entity-service";

const schema = z.object({
  key: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export async function createEntityRecordAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const res = await withActionContext(() =>
    createRecordByKey(parsed.data.key, parsed.data.data),
  );
  if (!res) return { ok: false as const };
  revalidatePath("/[locale]/(app)/studio/entities/[key]", "page");
  return { ok: true as const };
}

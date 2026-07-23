"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { createRelationship, deleteRelationship } from "@/engines/graph/relationship-service";

const createSchema = z.object({
  fromType: z.string().min(1),
  fromId: z.string().min(1),
  toType: z.string().min(1),
  toId: z.string().min(1),
});

export async function createRelationshipAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  try {
    const row = await withActionContext(() => createRelationship(parsed.data));
    revalidatePath("/[locale]/(app)/crm/graph", "page");
    return { ok: true as const, id: row.id };
  } catch {
    return { ok: false as const };
  }
}

export async function deleteRelationshipAction(id: string) {
  if (!id.trim()) return { ok: false as const };
  try {
    await withActionContext(() => deleteRelationship(id));
    revalidatePath("/[locale]/(app)/crm/graph", "page");
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

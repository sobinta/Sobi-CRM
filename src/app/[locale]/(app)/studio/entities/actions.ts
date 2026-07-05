"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createCustomEntity,
  createRecord,
} from "@/engines/entity-builder/entity-service";
import type { FieldDefinition, FieldType } from "@/core/metadata/types";

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.string(),
  required: z.boolean().optional(),
});

const entitySchema = z.object({
  nameSingular: z.string().trim().min(1),
  namePlural: z.string().trim().min(1),
  fields: z.array(fieldSchema).min(1),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export async function createEntityAction(input: unknown) {
  const parsed = entitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const fields: FieldDefinition[] = parsed.data.fields.map((f) => ({
    key: slugify(f.label),
    label: f.label,
    type: f.type as FieldType,
    required: f.required ?? false,
  }));

  const entity = await withActionContext(() =>
    createCustomEntity({
      key: slugify(parsed.data.nameSingular),
      nameSingular: parsed.data.nameSingular,
      namePlural: parsed.data.namePlural,
      titleField: fields[0].key,
      fields,
    }),
  );
  revalidatePath("/[locale]/(app)/studio/entities", "page");
  return { ok: true as const, key: entity.key };
}

export async function createRecordAction(
  entityDefId: string,
  data: Record<string, unknown>,
) {
  await withActionContext(() => createRecord(entityDefId, data));
  revalidatePath("/[locale]/(app)/studio/entities", "page");
  return { ok: true as const };
}

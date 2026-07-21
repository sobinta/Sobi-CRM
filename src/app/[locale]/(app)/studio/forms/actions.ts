"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { archiveFormVersion, rollbackForm, saveForm } from "@/engines/forms/service";
import { record } from "@/core/audit/audit";
import type { FormDefinition } from "@/engines/forms/types";

const fieldType = z.enum(["text", "textarea", "number", "currency", "boolean", "date", "datetime", "select", "multiselect", "email", "phone", "url", "relation", "user"]);
const optionSchema = z.object({ value: z.string().min(1).max(80), label: z.union([z.string().min(1).max(120), z.record(z.string(), z.string().max(120))]), tone: z.string().max(30).optional() });
const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),
  label: z.union([z.string().min(1).max(120), z.record(z.string(), z.string().max(120))]),
  type: fieldType,
  required: z.boolean().optional(), options: z.array(optionSchema).max(100).optional(), relationTo: z.string().max(60).optional(),
  default: z.unknown().optional(), placeholder: z.string().max(200).optional(), helpText: z.string().max(500).optional(),
  min: z.number().finite().optional(), max: z.number().finite().optional(), visibleWhen: z.unknown().optional(), computed: z.unknown().optional(),
  searchable: z.boolean().optional(), archived: z.boolean().optional(), system: z.literal(false).optional(),
});
const fieldRefSchema = z.object({ key: z.string().max(60), label: z.union([z.string(), z.record(z.string(), z.string())]).optional(), visibleWhen: z.unknown().optional(), computed: z.unknown().optional(), required: z.boolean().optional(), span: z.union([z.literal(1), z.literal(2)]).optional() });
const formSchema = z.object({
  entityKey: z.string().regex(/^[a-z][a-z0-9_]{0,59}$/), key: z.string().max(60), name: z.string().min(1).max(160),
  fieldDefinitions: z.array(fieldSchema).max(100).optional(),
  sections: z.array(z.object({ id: z.string().min(1).max(100), title: z.union([z.string().max(120), z.record(z.string(), z.string().max(120))]).optional(), visibleWhen: z.unknown().optional(), fields: z.array(fieldRefSchema).max(100) })).min(1).max(20),
});

export async function saveFormAction(definition: unknown, publish = false): Promise<{ ok: boolean; version?: number; error?: string }> {
  const parsed = formSchema.safeParse(definition);
  if (!parsed.success) return { ok: false, error: "invalid_form" };
  try {
    const version = await withActionContext(async () => {
      const result = await saveForm(parsed.data as FormDefinition, { publish, label: `${publish ? "Published" : "Draft"} ${parsed.data.name}` });
      await record({ category: "ADMIN", action: publish ? "form.publish" : "form.draft", entityType: "form", entityId: parsed.data.entityKey, after: { version: result.version } });
      return result.version;
    }, { permission: "admin.form.update" });
    revalidatePath("/[locale]/(app)/studio/forms", "page");
    return { ok: true, version };
  } catch { return { ok: false, error: "save_failed" }; }
}

export async function rollbackFormAction(entityKey: string, version: number) {
  if (!/^[a-z][a-z0-9_]{0,59}$/.test(entityKey) || !Number.isInteger(version)) return { ok: false as const };
  await withActionContext(() => rollbackForm(entityKey, version), { permission: "admin.form.update" });
  revalidatePath("/[locale]/(app)/studio/forms", "page");
  return { ok: true as const };
}

export async function archiveFormVersionAction(entityKey: string, version: number) {
  if (!/^[a-z][a-z0-9_]{0,59}$/.test(entityKey) || !Number.isInteger(version)) return { ok: false as const };
  await withActionContext(() => archiveFormVersion(entityKey, version), { permission: "admin.form.update" });
  revalidatePath("/[locale]/(app)/studio/forms", "page");
  return { ok: true as const };
}

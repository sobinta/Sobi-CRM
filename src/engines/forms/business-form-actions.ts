"use server";

import { withActionContext } from "@/core/auth/action-context";
import { resolveEntity } from "@/core/metadata/registry";
import { loadForm } from "./service";
import { canSafe } from "@/core/rbac/permission";

const BUSINESS_KEYS = new Set(["contact", "company", "lead", "deal", "task", "event", "campaign", "contract", "policy"]);

export async function loadBusinessCustomFormAction(entityKey: string) {
  if (!BUSINESS_KEYS.has(entityKey)) return null;
  return withActionContext(async () => {
    const [meta, form] = await Promise.all([resolveEntity(entityKey), loadForm(entityKey)]);
    if (!meta || !form) return null;
    const canCustomize = canSafe("admin.form.update");
    if (!form.fieldDefinitions?.some((field) => !field.archived)) return { canCustomize, definition: null };
    const customKeys = new Set(form.fieldDefinitions.filter((field) => !field.archived).map((field) => field.key));
    return { canCustomize, definition: {
      meta: { ...meta, fields: form.fieldDefinitions.filter((field) => !field.archived) },
      form: { ...form, sections: form.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => customKeys.has(field.key)) })).filter((section) => section.fields.length), fieldDefinitions: form.fieldDefinitions.filter((field) => !field.archived) },
    } };
  }, { intent: "read" });
}

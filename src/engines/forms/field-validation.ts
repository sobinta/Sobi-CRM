import type { FieldDefinition, FieldType } from "@/core/metadata/types";

const FIELD_TYPES = new Set<FieldType>(["text", "textarea", "number", "currency", "boolean", "date", "datetime", "select", "multiselect", "email", "phone", "url", "relation", "user"]);

export function normalizeFieldKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
}

export function validateExtensionFields(baseFields: FieldDefinition[], input: FieldDefinition[]): FieldDefinition[] {
  const reserved = new Set(baseFields.map((field) => field.key));
  const seen = new Set<string>();
  return input.map((field) => {
    const key = normalizeFieldKey(field.key);
    if (!key || reserved.has(key) || seen.has(key)) throw new Error("Invalid or duplicate custom field key");
    if (!FIELD_TYPES.has(field.type) || field.system) throw new Error("Unsupported custom field type");
    if (field.computed && field.required) throw new Error("Calculated fields cannot be required");
    if ((field.type === "select" || field.type === "multiselect") && !field.options?.length) throw new Error("Choice fields require options");
    seen.add(key);
    return { ...field, key, label: typeof field.label === "string" ? field.label.trim().slice(0, 120) : Object.fromEntries(Object.entries(field.label).map(([locale, label]) => [locale, label.trim().slice(0, 120)])), placeholder: field.placeholder?.trim().slice(0, 200), helpText: field.helpText?.trim().slice(0, 500), options: field.options?.slice(0, 100).map((option) => ({ value: normalizeFieldKey(option.value), label: typeof option.label === "string" ? option.label.trim().slice(0, 120) : Object.fromEntries(Object.entries(option.label).map(([locale, label]) => [locale, label.trim().slice(0, 120)])), tone: option.tone?.slice(0, 30) })), system: false };
  });
}

export interface FieldValidationResult { values: Record<string, unknown>; errors: Record<string, string> }
export function validateCustomFieldValues(fields: FieldDefinition[], input: unknown): FieldValidationResult {
  const values: Record<string, unknown> = {}; const errors: Record<string, string> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return { values, errors: { _form: "Invalid custom field payload" } };
  const allowed = new Map(fields.filter((field) => !field.archived && !field.system && !field.computed).map((field) => [field.key, field]));
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = allowed.get(key); if (!field) { errors[key] = "Unknown or read-only field"; continue; }
    if (raw === "" || raw === null || raw === undefined) { if (field.required) errors[key] = "Required"; continue; }
    if (["text", "textarea", "email", "phone", "url", "date", "datetime", "relation", "user", "select"].includes(field.type) && typeof raw !== "string") { errors[key] = "Expected text"; continue; }
    if ((field.type === "number" || field.type === "currency") && (typeof raw !== "number" || !Number.isFinite(raw))) { errors[key] = "Expected number"; continue; }
    if (field.type === "boolean" && typeof raw !== "boolean") { errors[key] = "Expected boolean"; continue; }
    if (field.type === "multiselect" && (!Array.isArray(raw) || raw.some((item) => typeof item !== "string"))) { errors[key] = "Expected choices"; continue; }
    if ((field.type === "select" || field.type === "multiselect") && field.options) { const choices = new Set(field.options.map((option) => option.value)); const selected = Array.isArray(raw) ? raw : [raw]; if (selected.some((value) => !choices.has(String(value)))) { errors[key] = "Invalid choice"; continue; } }
    if (typeof raw === "string" && ((field.min !== undefined && raw.length < field.min) || (field.max !== undefined && raw.length > field.max))) { errors[key] = "Invalid length"; continue; }
    if (typeof raw === "number" && ((field.min !== undefined && raw < field.min) || (field.max !== undefined && raw > field.max))) { errors[key] = "Out of range"; continue; }
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(raw))) { errors[key] = "Invalid email"; continue; }
    if (field.type === "url") { try { new URL(String(raw)); } catch { errors[key] = "Invalid URL"; continue; } }
    if ((field.type === "date" || field.type === "datetime") && !Number.isFinite(Date.parse(String(raw)))) { errors[key] = "Invalid date"; continue; }
    values[key] = raw;
  }
  for (const field of fields) if (field.required && !field.archived && values[field.key] === undefined && errors[field.key] === undefined) errors[field.key] = "Required";
  return { values, errors };
}

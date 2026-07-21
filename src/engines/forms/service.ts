import {
  saveVersion,
  getPublished,
  listVersions,
  getVersion,
  rollbackTo,
  archiveVersion,
} from "@/core/versions/version-manager";
import { getBuiltinEntity, resolveEntity } from "@/core/metadata/registry";
import type { FormDefinition, FormSection } from "./types";
import type { EntityMetadata } from "@/core/metadata/types";
import { authorize } from "@/core/rbac/guard";
import { saveTenantFieldExtensions } from "./field-extension-service";
import { validateCustomFieldValues } from "./field-validation";

/**
 * Forms service. A form is identified by its entityKey (one default form per
 * entity for now); its definition is stored as the published ConfigVersion of
 * object ("form", entityKey). Falls back to a metadata-derived default form so
 * every entity is usable before anyone opens the builder.
 */

function formObjectId(entityKey: string): string {
  return `form:${entityKey}`;
}

/** Build a default single-section form from entity metadata. */
export function defaultFormFromMetadata(meta: EntityMetadata): FormDefinition {
  const builtin = getBuiltinEntity(meta.key);
  const section: FormSection = {
    id: "default-section",
    title: { en: "Details", fa: "جزئیات", de: "Details" },
    fields: meta.fields
      .filter((f) => !f.system && !f.computed)
      .map((f) => ({ key: f.key })),
  };
  return {
    entityKey: meta.key,
    key: "default",
    name: meta.namePlural,
    fieldDefinitions: builtin
      ? meta.fields.filter((field) => !builtin.fields.some((base) => base.key === field.key))
      : meta.fields,
    sections: [section],
  };
}

/** Load the published form for an entity, or the metadata default. */
export async function loadForm(
  entityKey: string,
): Promise<FormDefinition | null> {
  const meta = await resolveEntity(entityKey);
  if (!meta) return null;

  const published = (await getPublished(
    "form",
    formObjectId(entityKey),
  )) as FormDefinition | null;

  return published ?? defaultFormFromMetadata(meta);
}

/** Load the latest editable draft, falling back to the published/default form. */
export async function loadEditorForm(entityKey: string): Promise<FormDefinition | null> {
  const meta = await resolveEntity(entityKey);
  if (!meta) return null;
  const versions = await listVersions("form", formObjectId(entityKey));
  const draft = versions.find((version) => version.status === "DRAFT");
  return (draft?.snapshot as unknown as FormDefinition | undefined) ?? loadForm(entityKey);
}

/** Save (and publish) a form definition as a new version. */
export async function saveForm(
  definition: FormDefinition,
  opts?: { publish?: boolean; label?: string },
): Promise<{ version: number }> {
  authorize("admin.form.update");
  if (opts?.publish ?? true) {
    await saveTenantFieldExtensions(definition.entityKey, definition.fieldDefinitions ?? []);
  }
  const { version } = await saveVersion(
    "form",
    formObjectId(definition.entityKey),
    definition,
    { publish: opts?.publish ?? true, label: opts?.label },
  );
  return { version };
}

export async function formHistory(entityKey: string) {
  return listVersions("form", formObjectId(entityKey));
}

export async function rollbackForm(entityKey: string, version: number) {
  authorize("admin.form.update");
  const target = await getVersion("form", formObjectId(entityKey), version);
  if (!target) throw new Error("Form version not found");
  const definition = target.snapshot as unknown as FormDefinition;
  await saveTenantFieldExtensions(entityKey, definition.fieldDefinitions ?? []);
  return rollbackTo("form", formObjectId(entityKey), version);
}

export async function archiveFormVersion(entityKey: string, version: number) {
  authorize("admin.form.update");
  return archiveVersion("form", formObjectId(entityKey), version);
}

export async function validatePublishedCustomFields(entityKey: string, input: unknown) {
  const form = await loadForm(entityKey);
  if (!form) throw new Error("Unknown business form");
  const result = validateCustomFieldValues(form.fieldDefinitions ?? [], input ?? {});
  if (Object.keys(result.errors).length) {
    const error = new Error("Custom field validation failed");
    Object.assign(error, { fieldErrors: result.errors });
    throw error;
  }
  return result.values;
}

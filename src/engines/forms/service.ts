import {
  saveVersion,
  getPublished,
  listVersions,
} from "@/core/versions/version-manager";
import { resolveEntity } from "@/core/metadata/registry";
import type { FormDefinition, FormSection } from "./types";
import type { EntityMetadata } from "@/core/metadata/types";

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
  const section: FormSection = {
    id: "default-section",
    title: "Details",
    fields: meta.fields
      .filter((f) => !f.system && !f.computed)
      .map((f) => ({ key: f.key })),
  };
  return {
    entityKey: meta.key,
    key: "default",
    name: meta.namePlural,
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

/** Save (and publish) a form definition as a new version. */
export async function saveForm(
  definition: FormDefinition,
  opts?: { publish?: boolean; label?: string },
): Promise<{ version: number }> {
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

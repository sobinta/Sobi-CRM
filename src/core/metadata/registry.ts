import { db } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import type { EntityMetadata, FieldDefinition } from "./types";

/**
 * Metadata registry.
 *
 * Built-in entities register in code at startup; custom entities load from
 * EntityDefinition. resolveEntity() merges both so consumers (forms, views,
 * search, Entity Builder) see one source of truth. Built-ins take precedence
 * for their key.
 */

const builtins = new Map<string, EntityMetadata>();

export function registerBuiltinEntity(meta: EntityMetadata): void {
  builtins.set(meta.key, meta);
}

export function getBuiltinEntity(key: string): EntityMetadata | undefined {
  return builtins.get(key);
}

export function listBuiltinEntities(): EntityMetadata[] {
  return [...builtins.values()];
}

/** Resolve an entity's metadata: built-in first, else tenant custom. */
export async function resolveEntity(
  key: string,
): Promise<EntityMetadata | null> {
  const builtin = builtins.get(key);
  if (builtin) return builtin;

  const ctx = getContext();
  if (!ctx) return null;

  const def = await db.entityDefinition.findFirst({
    where: { key, tenantId: ctx.tenantId },
  });
  if (!def) return null;

  return {
    key: def.key,
    nameSingular: def.nameSingular,
    namePlural: def.namePlural,
    icon: def.icon ?? undefined,
    source: "custom",
    module: "custom",
    fields: (def.fields as unknown as FieldDefinition[]) ?? [],
    titleField:
      (def.config as { titleField?: string })?.titleField ?? "name",
  };
}

/** List all entities available to the current tenant (built-ins + custom). */
export async function listEntities(): Promise<EntityMetadata[]> {
  const ctx = getContext();
  const result = [...builtins.values()];
  if (!ctx) return result;

  const custom = await db.entityDefinition.findMany({
    where: { tenantId: ctx.tenantId },
  });
  for (const def of custom) {
    if (builtins.has(def.key)) continue;
    result.push({
      key: def.key,
      nameSingular: def.nameSingular,
      namePlural: def.namePlural,
      icon: def.icon ?? undefined,
      source: "custom",
      module: "custom",
      fields: (def.fields as unknown as FieldDefinition[]) ?? [],
      titleField:
        (def.config as { titleField?: string })?.titleField ?? "name",
    });
  }
  return result;
}

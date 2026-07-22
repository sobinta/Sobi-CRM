import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import type { FieldDefinition } from "@/core/metadata/types";

/**
 * Entity Builder — create custom entities as metadata (EntityDefinition) whose
 * records live in the generic CustomRecord table. This gives every custom
 * entity CRUD, list views, search, and timeline with zero bespoke code — the
 * low-code proof. (Dedicated physical tables per entity are a documented
 * future step.)
 */

export interface CreateEntityInput {
  key: string;
  nameSingular: string;
  namePlural: string;
  icon?: string;
  titleField: string;
  fields: FieldDefinition[];
}

export async function listCustomEntities() {
  authorize("studio.entity.read");
  return db.entityDefinition.findMany({
    where: { source: "custom" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomEntity(key: string) {
  authorize("studio.entity.read");
  return db.entityDefinition.findFirst({ where: { key, source: "custom" } });
}

export async function createCustomEntity(input: CreateEntityInput) {
  authorize("studio.entity.update");
  const ctx = requireContext();
  const def = await db.entityDefinition.create({
    data: {
      tenantId: ctx.tenantId,
      key: input.key,
      nameSingular: input.nameSingular,
      namePlural: input.namePlural,
      icon: input.icon,
      source: "custom",
      fields: input.fields as unknown as Prisma.InputJsonValue,
      config: { titleField: input.titleField } as Prisma.InputJsonValue,
    },
  });
  await record({
    category: "ADMIN",
    action: "entity.create",
    entityType: "entity_definition",
    entityId: def.id,
  });
  return def;
}

export async function listRecords(entityDefId: string) {
  authorize("studio.entity.read");
  return db.customRecord.findMany({
    where: { entityDefId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function createRecord(
  entityDefId: string,
  data: Record<string, unknown>,
) {
  authorize("studio.entity.update");
  const ctx = requireContext();
  const rec = await db.customRecord.create({
    data: {
      tenantId: ctx.tenantId,
      entityDefId,
      data: data as Prisma.InputJsonValue,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });
  await record({
    category: "DATA",
    action: "record.create",
    entityType: "custom_record",
    entityId: rec.id,
  });
  return rec;
}

/** Coerce a raw string form value into the typed value for its field. */
function coerceFieldValue(field: FieldDefinition, raw: unknown): unknown {
  if (raw == null || raw === "") return field.type === "boolean" ? false : null;
  switch (field.type) {
    case "number":
    case "currency": {
      const n = Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "on";
    default:
      return typeof raw === "string" ? raw : String(raw);
  }
}

/**
 * Create a record addressed by entity KEY (used by the generic entity
 * workspace). Resolves the definition, coerces values against its field types,
 * and drops keys that aren't declared fields.
 */
export async function createRecordByKey(
  key: string,
  rawData: Record<string, unknown>,
) {
  authorize("studio.entity.update");
  const def = await db.entityDefinition.findFirst({
    where: { key, source: "custom" },
  });
  if (!def) return null;
  const fields = (def.fields as unknown as FieldDefinition[]) ?? [];
  const clean: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.system) continue;
    clean[field.key] = coerceFieldValue(field, rawData[field.key]);
  }
  return createRecord(def.id, clean);
}

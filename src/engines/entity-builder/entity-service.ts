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
  return rec;
}

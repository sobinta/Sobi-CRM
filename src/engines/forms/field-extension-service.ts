import "server-only";

import { db, Prisma } from "@/core/db";
import { getBuiltinEntity, resolveEntity } from "@/core/metadata/registry";
import type { FieldDefinition } from "@/core/metadata/types";
import { authorize } from "@/core/rbac/guard";
import { requireContext } from "@/core/tenancy/context";
import { record } from "@/core/audit/audit";
import { validateExtensionFields } from "./field-validation";

export async function saveTenantFieldExtensions(entityKey: string, fields: FieldDefinition[]) {
  authorize("admin.form.update");
  const ctx = requireContext();
  const builtin = getBuiltinEntity(entityKey);

  if (builtin) {
    const safe = validateExtensionFields(builtin.fields, fields);
    const row = await db.entityDefinition.upsert({
      where: { tenantId_key: { tenantId: ctx.tenantId, key: entityKey } },
      create: {
        tenantId: ctx.tenantId,
        key: entityKey,
        nameSingular: builtin.nameSingular,
        namePlural: builtin.namePlural,
        icon: builtin.icon,
        source: "extension",
        fields: safe as unknown as Prisma.InputJsonValue,
        config: { extends: entityKey } as Prisma.InputJsonValue,
      },
      update: { fields: safe as unknown as Prisma.InputJsonValue, deletedAt: null },
    });
    await record({ category: "ADMIN", action: "form.fields.publish", entityType: "entity_extension", entityId: row.id, after: { entityKey, fieldCount: safe.length } });
    return safe;
  }

  const meta = await resolveEntity(entityKey);
  if (!meta || meta.source !== "custom") throw new Error("Unknown business entity");
  const row = await db.entityDefinition.findFirst({ where: { tenantId: ctx.tenantId, key: entityKey, source: "custom" } });
  if (!row) throw new Error("Unknown custom entity");
  const existing = (row.fields as unknown as FieldDefinition[]) ?? [];
  const existingKeys = new Set(existing.map((field) => field.key));
  const additions = validateExtensionFields(existing, fields.filter((field) => !existingKeys.has(field.key)));
  const requested = new Map(fields.map((field) => [field.key, field]));
  const merged = [
    ...existing.map((field) => requested.has(field.key) ? { ...field, archived: requested.get(field.key)?.archived ?? field.archived } : field),
    ...additions,
  ];
  await db.entityDefinition.update({ where: { id: row.id }, data: { fields: merged as unknown as Prisma.InputJsonValue } });
  return merged;
}

import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { assertTenantReference, type TenantReferenceKind } from "@/core/tenancy/relations";

/**
 * Manual relationship links — the persistence behind the Relationship Graph's
 * drag-to-connect gesture. The graph's *derived* edges (contact → company,
 * deal → contact/company) come straight from existing foreign keys and are
 * never stored here; this table is only for connections a user draws by hand
 * that have no other home (e.g. two contacts who happen to know each other).
 */

const LINKABLE_TYPES = new Set<TenantReferenceKind>(["contact", "company", "deal"]);

function assertLinkable(type: string): asserts type is TenantReferenceKind {
  if (!LINKABLE_TYPES.has(type as TenantReferenceKind)) {
    throw new Error(`Unsupported relationship endpoint type: ${type}`);
  }
}

export interface RelationshipEdge {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  kind: string;
}

export async function listManualRelationships(): Promise<RelationshipEdge[]> {
  requireContext();
  const rows = await db.relationship.findMany({
    where: { kind: "linked" },
    select: { id: true, fromType: true, fromId: true, toType: true, toId: true, kind: true },
  });
  return rows;
}

export async function createRelationship(input: {
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
}): Promise<RelationshipEdge> {
  authorize("crm.relationship.create");
  assertLinkable(input.fromType);
  assertLinkable(input.toType);
  await Promise.all([
    assertTenantReference(input.fromType, input.fromId),
    assertTenantReference(input.toType, input.toId),
  ]);
  const ctx = requireContext();

  const row = await db.relationship.upsert({
    where: {
      tenantId_fromType_fromId_toType_toId_kind: {
        tenantId: ctx.tenantId,
        fromType: input.fromType,
        fromId: input.fromId,
        toType: input.toType,
        toId: input.toId,
        kind: "linked",
      },
    },
    create: {
      tenantId: ctx.tenantId,
      fromType: input.fromType,
      fromId: input.fromId,
      toType: input.toType,
      toId: input.toId,
      kind: "linked",
    },
    update: {},
  });

  await record({
    category: "DATA",
    action: "relationship.create",
    entityType: "relationship",
    entityId: row.id,
  });

  return row;
}

export async function deleteRelationship(id: string): Promise<void> {
  authorize("crm.relationship.delete");
  const ctx = requireContext();
  const existing = await db.relationship.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return;
  await db.relationship.delete({ where: { id } });
  await record({
    category: "DATA",
    action: "relationship.delete",
    entityType: "relationship",
    entityId: id,
  });
}

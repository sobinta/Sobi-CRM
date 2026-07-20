import { db } from "@/core/db";
import { TenantMismatchError } from "@/core/tenancy/errors";

/**
 * Business-record types accepted by polymorphic links (timeline, files,
 * tasks, calendar). Unknown keys are treated as tenant custom-entity keys.
 */
export type TenantReferenceKind =
  | "company"
  | "contact"
  | "lead"
  | "deal"
  | "pipeline"
  | "stage"
  | "contract"
  | "task"
  | "file"
  | "document_checklist_item"
  | "calendar_event"
  | "policy"
  | "claim"
  | "membership"
  | string;

export interface TenantReference {
  kind: TenantReferenceKind;
  id: string | null | undefined;
}

function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase().replaceAll("-", "_");
}

/**
 * Assert that a referenced row is visible through the active tenant database
 * capability. A missing row and a foreign-tenant row intentionally produce the
 * same opaque security error to avoid resource enumeration.
 */
export async function assertTenantReference(
  kind: TenantReferenceKind,
  id: string | null | undefined,
): Promise<void> {
  if (id == null) return;
  if (!id.trim()) throw new TenantMismatchError();

  const normalized = normalizeKind(kind);
  let found: { id: string } | null;

  switch (normalized) {
    case "company":
      found = await db.company.findFirst({ where: { id }, select: { id: true } });
      break;
    case "contact":
      found = await db.contact.findFirst({ where: { id }, select: { id: true } });
      break;
    case "lead":
      found = await db.lead.findFirst({ where: { id }, select: { id: true } });
      break;
    case "deal":
      found = await db.deal.findFirst({ where: { id }, select: { id: true } });
      break;
    case "pipeline":
      found = await db.pipeline.findFirst({ where: { id }, select: { id: true } });
      break;
    case "stage":
      found = await db.stage.findFirst({ where: { id }, select: { id: true } });
      break;
    case "contract":
      found = await db.contract.findFirst({ where: { id }, select: { id: true } });
      break;
    case "task":
      found = await db.task.findFirst({ where: { id }, select: { id: true } });
      break;
    case "file":
    case "file_object":
      found = await db.fileObject.findFirst({ where: { id }, select: { id: true } });
      break;
    case "document_checklist_item":
    case "checklist_item":
      found = await db.documentChecklistItem.findFirst({
        where: { id },
        select: { id: true },
      });
      break;
    case "calendar_event":
    case "event":
      found = await db.calendarEvent.findFirst({ where: { id }, select: { id: true } });
      break;
    case "policy":
      found = await db.policy.findFirst({ where: { id }, select: { id: true } });
      break;
    case "claim":
      found = await db.claim.findFirst({ where: { id }, select: { id: true } });
      break;
    case "membership":
      found = await db.membership.findFirst({ where: { id }, select: { id: true } });
      break;
    default: {
      const customKey = normalized.startsWith("custom:")
        ? normalized.slice("custom:".length)
        : normalized;
      const definition = await db.entityDefinition.findFirst({
        where: { key: customKey, source: "custom" },
        select: { id: true },
      });
      found = definition
        ? await db.customRecord.findFirst({
            where: { id, entityDefId: definition.id },
            select: { id: true },
          })
        : null;
    }
  }

  if (!found) throw new TenantMismatchError();
}

export async function assertTenantReferences(
  references: readonly TenantReference[],
): Promise<void> {
  await Promise.all(
    references.map(({ kind, id }) => assertTenantReference(kind, id)),
  );
}

/** Validate the two halves of a nullable polymorphic relation as one value. */
export async function assertPolymorphicTenantReference(
  kind: string | null | undefined,
  id: string | null | undefined,
): Promise<void> {
  if (kind == null && id == null) return;
  if (!kind || !id) throw new TenantMismatchError();
  await assertTenantReference(kind, id);
}

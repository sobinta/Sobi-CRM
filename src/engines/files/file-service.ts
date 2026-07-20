import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { publish } from "@/core/event-bus/bus";
import { addActivity } from "@/engines/timeline/timeline";
import { storage, makeStorageKey } from "./storage";
import {
  assertPolymorphicTenantReference,
  assertTenantReference,
} from "@/core/tenancy/relations";

/**
 * File engine — secure upload with versioning + checklist support. Uploads are
 * audited and (when attached to a record) mirrored to its timeline.
 */

export interface UploadInput {
  filename: string;
  mimeType: string;
  data: Buffer;
  category?: string;
  entityType?: string;
  entityId?: string;
  expiresAt?: Date | null;
  /** When set, satisfies a checklist item. */
  checklistItemId?: string;
}

export async function uploadFile(input: UploadInput) {
  authorize("ops.file.create");
  const ctx = requireContext();

  await Promise.all([
    assertPolymorphicTenantReference(input.entityType, input.entityId),
    assertTenantReference("document_checklist_item", input.checklistItemId),
  ]);
  const storageKey = makeStorageKey(ctx.tenantId, input.filename);
  await storage.put(storageKey, input.data);

  const file = await db.fileObject.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.filename,
      storageKey,
      mimeType: input.mimeType,
      size: input.data.length,
      category: input.category,
      entityType: input.entityType,
      entityId: input.entityId,
      expiresAt: input.expiresAt,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      versions: {
        create: {
          tenantId: ctx.tenantId,
          version: 1,
          storageKey,
          size: input.data.length,
          createdById: ctx.membershipId,
        },
      },
    },
  });

  if (input.checklistItemId) {
    await db.documentChecklistItem.update({
      where: { id: input.checklistItemId },
      data: { fileId: file.id, status: "provided" },
    });
  }

  await Promise.all([
    publish({ type: "file.uploaded", entityType: "file", entityId: file.id }),
    record({ category: "FILE", action: "file.upload", entityType: "file", entityId: file.id }),
  ]);

  if (input.entityType && input.entityId) {
    await addActivity({
      entityType: input.entityType,
      entityId: input.entityId,
      kind: "file",
      title: `File uploaded: ${input.filename}`,
    });
  }

  return file;
}

export async function listFiles(params?: {
  entityType?: string;
  entityId?: string;
}) {
  authorize("ops.file.read");
  return db.fileObject.findMany({
    where: {
      entityType: params?.entityType,
      entityId: params?.entityId,
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Read a file for download after a permission + signature check. */
export async function readFileForDownload(fileId: string) {
  authorize("ops.file.read");
  const file = await db.fileObject.findFirst({ where: { id: fileId } });
  if (!file) return null;
  const data = await storage.get(file.storageKey);
  await record({
    category: "FILE",
    action: "file.download",
    entityType: "file",
    entityId: fileId,
  });
  return { file, data };
}

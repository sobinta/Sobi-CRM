import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { Prisma } from "@/core/db";

/**
 * Version Management — generic draft/published/archived history for any
 * configurable object (form, workflow, dashboard, template, automation,
 * entity, rule). One service backs the history/rollback UI in every builder.
 */

export type VersionObjectType =
  | "form"
  | "workflow"
  | "dashboard"
  | "template"
  | "automation"
  | "entity"
  | "rule";

/** Save a new version (as DRAFT by default). Auto-increments the number. */
export async function saveVersion(
  objectType: VersionObjectType,
  objectId: string,
  snapshot: unknown,
  opts?: { label?: string; publish?: boolean },
): Promise<{ version: number; id: string }> {
  const ctx = requireContext();
  const latest = await db.configVersion.findFirst({
    where: { objectType, objectId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;

  const created = await db.configVersion.create({
    data: {
      tenantId: ctx.tenantId,
      objectType,
      objectId,
      version,
      status: opts?.publish ? "PUBLISHED" : "DRAFT",
      snapshot: snapshot as Prisma.InputJsonValue,
      label: opts?.label,
      authorId: ctx.membershipId,
      publishedAt: opts?.publish ? new Date() : null,
    },
  });

  if (opts?.publish) {
    // Archive previously published versions of this object.
    await db.configVersion.updateMany({
      where: {
        objectType,
        objectId,
        status: "PUBLISHED",
        id: { not: created.id },
      },
      data: { status: "ARCHIVED" },
    });
  }

  return { version, id: created.id };
}

/** Publish a specific version and archive the rest. */
export async function publishVersion(
  objectType: VersionObjectType,
  objectId: string,
  version: number,
): Promise<void> {
  await db.configVersion.updateMany({
    where: { objectType, objectId, status: "PUBLISHED" },
    data: { status: "ARCHIVED" },
  });
  await db.configVersion.updateMany({
    where: { objectType, objectId, version },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

/** Roll back by creating a new published version from an old snapshot. */
export async function rollbackTo(
  objectType: VersionObjectType,
  objectId: string,
  version: number,
): Promise<{ version: number; id: string } | null> {
  const target = await db.configVersion.findFirst({
    where: { objectType, objectId, version },
  });
  if (!target) return null;
  return saveVersion(objectType, objectId, target.snapshot, {
    label: `Rollback to v${version}`,
    publish: true,
  });
}

/** The currently published snapshot, if any. */
export async function getPublished(
  objectType: VersionObjectType,
  objectId: string,
): Promise<unknown | null> {
  const row = await db.configVersion.findFirst({
    where: { objectType, objectId, status: "PUBLISHED" },
    orderBy: { version: "desc" },
  });
  return row?.snapshot ?? null;
}

/** Full version history (newest first) for the history panel. */
export async function listVersions(
  objectType: VersionObjectType,
  objectId: string,
) {
  return db.configVersion.findMany({
    where: { objectType, objectId },
    orderBy: { version: "desc" },
  });
}

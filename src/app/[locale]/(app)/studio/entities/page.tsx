import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCustomEntities } from "@/engines/entity-builder/entity-service";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { EntitiesClient, type EntityRow } from "./entities-client";
import type { FieldDefinition } from "@/core/metadata/types";

export default async function EntitiesPage() {
  const data = await withPlatformContext(async () => {
    const entities = await listCustomEntities();
    const withCounts = await Promise.all(
      entities.map(async (e) => ({
        e,
        count: await db.customRecord.count({ where: { entityDefId: e.id } }),
      })),
    );
    return withCounts;
  });
  if (!data) notFound();

  const rows: EntityRow[] = data.map(({ e, count }) => ({
    id: e.id,
    key: e.key,
    nameSingular: e.nameSingular,
    namePlural: e.namePlural,
    fieldCount: ((e.fields as unknown as FieldDefinition[]) ?? []).length,
    recordCount: count,
  }));

  return (
    <div>
      <PageHeader
        title="Entity builder"
        description="Create custom entities with their own fields — no code required."
      />
      <EntitiesClient entities={rows} />
    </div>
  );
}

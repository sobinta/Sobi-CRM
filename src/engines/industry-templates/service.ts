import { db } from "@/core/db";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { hasFeature, setFeatureGrant } from "@/core/features/features";
import {
  createCustomEntity,
  createRecord,
} from "@/engines/entity-builder/entity-service";
import { INDUSTRY_TEMPLATES, getIndustryTemplate } from "./registry";

/** Feature-grant key marking an industry template as applied to the tenant. */
function industryFeatureKey(key: string): string {
  return `industry.${key}`;
}

export interface IndustryStatus {
  key: string;
  name: string;
  description: string;
  icon: string;
  entityCount: number;
  applied: boolean;
}

export async function listIndustryTemplates(): Promise<IndustryStatus[]> {
  authorize("studio.entity.read");
  const results: IndustryStatus[] = [];
  for (const tpl of INDUSTRY_TEMPLATES) {
    results.push({
      key: tpl.key,
      name: tpl.name,
      description: tpl.description,
      icon: tpl.icon,
      entityCount: tpl.entities.length,
      applied: await hasFeature(industryFeatureKey(tpl.key)),
    });
  }
  return results;
}

export interface ApplyResult {
  ok: boolean;
  entitiesCreated: number;
  recordsCreated: number;
}

/**
 * Apply an industry template to the current tenant: create any missing entity
 * definitions and seed their sample records, then mark the industry active.
 * Idempotent — entities that already exist (by key) are left untouched and
 * their samples are not duplicated.
 */
export async function applyIndustryTemplate(key: string): Promise<ApplyResult> {
  authorize("studio.entity.update");
  const tpl = getIndustryTemplate(key);
  if (!tpl) return { ok: false, entitiesCreated: 0, recordsCreated: 0 };

  let entitiesCreated = 0;
  let recordsCreated = 0;

  for (const entity of tpl.entities) {
    const existing = await db.entityDefinition.findFirst({
      where: { key: entity.key },
      select: { id: true },
    });
    if (existing) continue;

    const def = await createCustomEntity({
      key: entity.key,
      nameSingular: entity.nameSingular,
      namePlural: entity.namePlural,
      icon: entity.icon,
      titleField: entity.titleField,
      fields: entity.fields,
    });
    entitiesCreated += 1;

    for (const sample of entity.samples ?? []) {
      await createRecord(def.id, sample);
      recordsCreated += 1;
    }
  }

  await setFeatureGrant(industryFeatureKey(tpl.key), true, {
    appliedAt: new Date().toISOString(),
  });
  await record({
    category: "ADMIN",
    action: "industry.apply",
    entityType: "industry_template",
    entityId: tpl.key,
    after: { entitiesCreated, recordsCreated },
  });

  return { ok: true, entitiesCreated, recordsCreated };
}

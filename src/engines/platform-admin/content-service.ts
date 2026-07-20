import { systemDb } from "@/core/db/system";
import { requireSuperAdmin } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { getContext } from "@/core/tenancy/context";
import type { EditableContentKey } from "./content-keys";

export { EDITABLE_CONTENT_KEYS, type EditableContentKey } from "./content-keys";

/**
 * Curated, super-admin-editable overrides for the landing page's most
 * commercially important copy (hero, CTA banner). Keyed by a dot-path into
 * the `landing` i18n namespace (e.g. "hero.headline1") + locale. The landing
 * page falls back to the static translation when no override row exists —
 * this is not a full CMS replacing next-intl, just an escape hatch for the
 * handful of strings worth editing without a redeploy.
 */

export async function listContentOverrides() {
  requireSuperAdmin();
  return systemDb.landingContentOverride.findMany({ orderBy: { key: "asc" } });
}

/** Public read — no auth required, used by the landing page itself. */
export async function getContentOverridesPublic(): Promise<Map<string, string>> {
  const rows = await systemDb.landingContentOverride.findMany();
  const map = new Map<string, string>();
  for (const row of rows) map.set(`${row.locale}:${row.key}`, row.value);
  return map;
}

/** Resolve an override if present, else the caller's own static translation. */
export function resolveContent(
  overrides: Map<string, string>,
  locale: string,
  key: EditableContentKey,
  fallback: string,
): string {
  return overrides.get(`${locale}:${key}`) ?? fallback;
}

export async function setContentOverride(
  key: EditableContentKey,
  locale: string,
  value: string,
) {
  requireSuperAdmin();
  const ctx = getContext();
  const row = await systemDb.landingContentOverride.upsert({
    where: { key_locale: { key, locale } },
    create: { key, locale, value, updatedById: ctx?.membershipId },
    update: { value, updatedById: ctx?.membershipId },
  });
  await record({
    category: "ADMIN",
    action: "platform.content.update",
    entityType: "landingContentOverride",
    entityId: row.id,
    after: { key, locale, value },
  });
  return row;
}

export async function clearContentOverride(key: EditableContentKey, locale: string) {
  requireSuperAdmin();
  await systemDb.landingContentOverride.deleteMany({ where: { key, locale } });
  await record({
    category: "ADMIN",
    action: "platform.content.clear",
    entityType: "landingContentOverride",
  });
}

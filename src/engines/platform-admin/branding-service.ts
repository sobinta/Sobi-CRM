import { rawDb } from "@/core/db";
import { requireSuperAdmin } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { getContext } from "@/core/tenancy/context";

/**
 * Site-wide brand assets (logo, favicon). Deliberately URL-based rather than
 * a file-upload pipeline: this app targets serverless deployment (Vercel),
 * where the local disk isn't persistent/writable at runtime, so the admin
 * pastes a URL to an already-hosted image (any image host, or object storage
 * if that's wired in later) instead of uploading raw bytes through our own
 * server.
 */

export type AssetSlot = "logo" | "favicon";
export const ASSET_SLOTS: AssetSlot[] = ["logo", "favicon"];

export async function listSiteAssets() {
  return rawDb.siteAsset.findMany();
}

/** Public read — no auth required, used wherever the logo/favicon render. */
export async function getSiteAssetsPublic(): Promise<Record<string, string>> {
  const rows = await rawDb.siteAsset.findMany();
  const map: Record<string, string> = {};
  for (const row of rows) map[row.slot] = row.url;
  return map;
}

export async function setSiteAsset(slot: AssetSlot, url: string) {
  requireSuperAdmin();
  const ctx = getContext();
  const row = await rawDb.siteAsset.upsert({
    where: { slot },
    create: { slot, url, updatedById: ctx?.membershipId },
    update: { url, updatedById: ctx?.membershipId },
  });
  await record({
    category: "ADMIN",
    action: "platform.asset.update",
    entityType: "siteAsset",
    entityId: row.id,
    after: { slot, url },
  });
  return row;
}

export async function clearSiteAsset(slot: AssetSlot) {
  requireSuperAdmin();
  await rawDb.siteAsset.deleteMany({ where: { slot } });
  await record({
    category: "ADMIN",
    action: "platform.asset.clear",
    entityType: "siteAsset",
  });
}

import crypto from "node:crypto";
import { db } from "@/core/db";
import { systemDb } from "@/core/db/system";
import {
  publicTenantContext,
  requireContext,
  runWithContext,
} from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";

/**
 * API key service for the public API. Keys are shown once at creation; only a
 * SHA-256 hash is stored. Verification (used by the public API middleware)
 * resolves the tenant from the hash.
 */

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createApiKey(name: string, scopes: string[] = ["read"]) {
  authorize("admin.integration.update");
  const ctx = requireContext();
  const raw = `clk_${crypto.randomBytes(24).toString("base64url")}`;
  const prefix = raw.slice(0, 12);

  const apiKey = await db.apiKey.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      keyHash: hashKey(raw),
      prefix,
      scopes,
      createdById: ctx.membershipId,
    },
  });

  await record({
    category: "ADMIN",
    action: "apikey.create",
    entityType: "api_key",
    entityId: apiKey.id,
  });

  // Return the plaintext once — never retrievable again.
  return { id: apiKey.id, key: raw, prefix };
}

export async function listApiKeys() {
  authorize("admin.integration.read");
  return db.apiKey.findMany({
    where: { revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(id: string) {
  authorize("admin.integration.update");
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  await record({
    category: "ADMIN",
    action: "apikey.revoke",
    entityType: "api_key",
    entityId: id,
  });
}

/** Resolve an API key to its tenant through the narrow system gateway. */
export async function verifyApiKey(
  raw: string,
): Promise<{ tenantId: string; scopes: string[] } | null> {
  const key = await systemDb.apiKey.findFirst({
    where: { keyHash: hashKey(raw), revokedAt: null },
    select: { id: true, tenantId: true, scopes: true },
  });
  if (!key) return null;
  await runWithContext(publicTenantContext(key.tenantId), () =>
    db.apiKey.updateMany({
      where: { id: key.id, revokedAt: null },
      data: { lastUsedAt: new Date() },
    }),
  );
  return { tenantId: key.tenantId, scopes: key.scopes };
}

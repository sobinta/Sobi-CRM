"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import {
  createApiKey,
  revokeApiKey,
} from "@/engines/integrations/api-key-service";
import { record } from "@/core/audit/audit";
import { resolveOutboundUrl } from "@/core/security/outbound-url";

const webhookSchema = z.object({
  name: z.string().trim().min(1),
  url: z.url(),
  events: z.array(z.string()).min(1),
});

export async function createWebhookAction(input: unknown) {
  const parsed = webhookSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  try {
    await resolveOutboundUrl(parsed.data.url);
  } catch {
    return { ok: false as const };
  }
  await withActionContext(
    async () => {
      const { tenantId, membershipId } = requireContext();
      await db.webhook.create({
        data: {
          tenantId,
          name: parsed.data.name,
          url: parsed.data.url,
          events: parsed.data.events,
          secret: `whsec_${crypto.randomBytes(16).toString("hex")}`,
          createdById: membershipId,
        },
      });
      await record({ category: "ADMIN", action: "webhook.create", entityType: "webhook" });
    },
    { permission: "admin.integration.update" },
  );
  revalidatePath("/[locale]/(app)/admin/integrations", "page");
  return { ok: true as const };
}

export async function deleteWebhookAction(id: string) {
  await withActionContext(
    () => db.webhook.delete({ where: { id } }),
    { permission: "admin.integration.update" },
  );
  revalidatePath("/[locale]/(app)/admin/integrations", "page");
  return { ok: true as const };
}

export async function createApiKeyAction(name: string) {
  const result = await withActionContext(() => createApiKey(name));
  revalidatePath("/[locale]/(app)/admin/integrations", "page");
  return { ok: true as const, key: result.key };
}

export async function revokeApiKeyAction(id: string) {
  await withActionContext(() => revokeApiKey(id));
  revalidatePath("/[locale]/(app)/admin/integrations", "page");
  return { ok: true as const };
}

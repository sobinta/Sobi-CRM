import { db, Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import {
  publicTenantContext,
  runWithContext,
} from "@/core/tenancy/context";
import { publish } from "@/core/event-bus/bus";
import { addActivity } from "@/engines/timeline/timeline";

/**
 * Portal engine — public (unauthenticated) intake. A public form submission
 * creates a Lead in the target tenant. Runs in a minimal system context scoped
 * to that tenant so the event bus + isolation still apply. The tenant is
 * resolved from a public slug (here: the tenant slug).
 */

export interface PublicLeadInput {
  tenantSlug: string;
  title: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
}

export async function submitPublicLead(
  input: PublicLeadInput,
): Promise<{ ok: boolean }> {
  const tenant = await systemDb.tenant.findFirst({
    where: { slug: input.tenantSlug, deletedAt: null },
    select: { id: true },
  });
  if (!tenant) return { ok: false };

  // The system gateway resolves only the tenant. Business data is accessed
  // through the tenant capability and remains covered by RLS.
  await runWithContext(publicTenantContext(tenant.id), async () => {
    const lead = await db.lead.create({
      data: {
        tenantId: tenant.id,
        title: input.title || `Website enquiry from ${input.name}`,
        companyName: null,
        email: input.email,
        phone: input.phone,
        status: "new",
        source: "website",
        customFields: {
          name: input.name,
          message: input.message ?? "",
        } as Prisma.InputJsonValue,
      },
    });

    await addActivity({
      entityType: "lead",
      entityId: lead.id,
      kind: "system",
      title: "Lead received (website)",
      occurredAt: lead.createdAt,
    });

    await publish({
        type: "lead.created",
        entityType: "lead",
        entityId: lead.id,
        payload: { source: "website", name: input.name },
    });
  });

  return { ok: true };
}

export async function getPublicTenant(slug: string) {
  const tenant = await systemDb.tenant.findFirst({
    where: { slug, deletedAt: null },
    select: { name: true, slug: true, settings: true },
  });
  return tenant;
}

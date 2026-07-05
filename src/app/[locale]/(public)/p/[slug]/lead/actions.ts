"use server";

import { z } from "zod";
import { submitPublicLead } from "@/engines/portal/portal-service";

const schema = z.object({
  tenantSlug: z.string().min(1),
  name: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export async function submitLeadAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const res = await submitPublicLead({
    tenantSlug: parsed.data.tenantSlug,
    title: `Website enquiry from ${parsed.data.name}`,
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone,
    message: parsed.data.message,
  });
  return res.ok ? { ok: true as const } : { ok: false as const };
}

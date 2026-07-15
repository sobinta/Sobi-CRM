"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createCampaign,
  generateCampaignEmail,
  updateCampaignEmail,
  skipCampaignEmail,
  sendCampaignEmail,
} from "@/engines/campaigns/campaign-service";

const createSchema = z.object({
  name: z.string().trim().min(1),
  segmentKey: z.string().min(1),
  goal: z.string().trim().min(1),
});

export async function createCampaignAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const campaign = await withActionContext(() => createCampaign(parsed.data));
  revalidatePath("/[locale]/(app)/crm/campaigns", "page");
  return { ok: true as const, id: campaign.id, recipientCount: campaign.emails.length };
}

export async function generateCampaignEmailAction(campaignEmailId: string) {
  const updated = await withActionContext(() => generateCampaignEmail(campaignEmailId));
  return updated
    ? { ok: true as const, subject: updated.subject, bodyText: updated.bodyText }
    : { ok: false as const };
}

export async function updateCampaignEmailAction(id: string, subject: string, bodyText: string) {
  await withActionContext(() => updateCampaignEmail(id, subject, bodyText));
  return { ok: true as const };
}

export async function skipCampaignEmailAction(id: string) {
  await withActionContext(() => skipCampaignEmail(id));
  revalidatePath("/[locale]/(app)/crm/campaigns/[id]", "page");
  return { ok: true as const };
}

export async function sendCampaignEmailAction(id: string) {
  const res = await withActionContext(() => sendCampaignEmail(id));
  revalidatePath("/[locale]/(app)/crm/campaigns/[id]", "page");
  return res;
}

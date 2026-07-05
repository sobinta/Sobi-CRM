"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createAutomation,
  toggleAutomation,
} from "@/engines/automation/automation-service";

const schema = z.object({
  name: z.string().trim().min(1),
  eventType: z.string().min(1),
  actionType: z.string().min(1),
  actionValue: z.string().optional(),
});

export async function createAutomationAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const configKey =
    parsed.data.actionType === "create_task" ? "title" : "message";

  await withActionContext(() =>
    createAutomation({
      name: parsed.data.name,
      eventType: parsed.data.eventType,
      actions: [
        {
          type: parsed.data.actionType,
          config: { [configKey]: parsed.data.actionValue ?? "" },
        },
      ],
    }),
  );
  revalidatePath("/[locale]/(app)/studio/automations", "page");
  return { ok: true as const };
}

export async function toggleAutomationAction(id: string, enabled: boolean) {
  await withActionContext(() => toggleAutomation(id, enabled));
  revalidatePath("/[locale]/(app)/studio/automations", "page");
  return { ok: true as const };
}

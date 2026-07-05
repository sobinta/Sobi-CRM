"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { saveForm } from "@/engines/forms/service";
import { record } from "@/core/audit/audit";
import type { FormDefinition } from "@/engines/forms/types";

/** Save (publish) a form definition from the Form Builder. */
export async function saveFormAction(
  definition: FormDefinition,
): Promise<{ ok: boolean; version?: number }> {
  const result = await withActionContext(
    async () => {
      const { version } = await saveForm(definition, {
        label: `Edited ${definition.name}`,
      });
      await record({
        category: "ADMIN",
        action: "form.publish",
        entityType: "form",
        entityId: definition.entityKey,
        after: { version },
      });
      return version;
    },
    { permission: "admin.form.update" },
  );
  revalidatePath("/[locale]/(app)/studio/forms", "page");
  return { ok: true, version: result };
}

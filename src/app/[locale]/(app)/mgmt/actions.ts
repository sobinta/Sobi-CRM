"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { saveDashboard } from "@/engines/dashboards/dashboard-service";
import { search } from "@/engines/search/search-service";
import type { LayoutItem } from "@/components/patterns/widgets/widget-types";

export async function saveDashboardAction(
  layout: LayoutItem[],
): Promise<{ ok: boolean }> {
  await withActionContext(() => saveDashboard(layout));
  revalidatePath("/[locale]/(app)/mgmt", "page");
  return { ok: true };
}

/** Universal search used by the ⌘K palette. */
export async function searchAction(query: string) {
  const results = await withActionContext(() => search(query), {
    intent: "read",
  });
  return { results };
}

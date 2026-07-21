"use server";

import { withActionContext } from "@/core/auth/action-context";
import {
  finishDashboardTour,
  resetDashboardTour,
} from "@/core/onboarding/tour-service";

export async function finishDashboardTourAction(outcome: "completed" | "skipped") {
  if (outcome !== "completed" && outcome !== "skipped") {
    throw new Error("Invalid onboarding outcome");
  }
  return withActionContext(() => finishDashboardTour(outcome), { intent: "write" });
}

export async function resetDashboardTourAction() {
  return withActionContext(resetDashboardTour, { intent: "write" });
}

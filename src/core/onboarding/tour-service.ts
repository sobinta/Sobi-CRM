import "server-only";

import { db } from "@/core/db";
import { record } from "@/core/audit/audit";
import { requireContext } from "@/core/tenancy/context";
import {
  DASHBOARD_TOUR_KEY,
  DASHBOARD_TOUR_VERSION,
  tourIsDone,
} from "./tour-config";

export async function getDashboardTourCompleted(): Promise<boolean> {
  const ctx = requireContext();
  const progress = await db.onboardingProgress.findUnique({
    where: {
      tenantId_membershipId_tourKey_version: {
        tenantId: ctx.tenantId,
        membershipId: ctx.membershipId,
        tourKey: DASHBOARD_TOUR_KEY,
        version: DASHBOARD_TOUR_VERSION,
      },
    },
    select: { version: true, completedAt: true, skippedAt: true },
  });
  return tourIsDone(progress);
}

export async function finishDashboardTour(outcome: "completed" | "skipped"): Promise<void> {
  const ctx = requireContext();
  const now = new Date();
  const timestamps = outcome === "completed"
    ? { completedAt: now, skippedAt: null }
    : { skippedAt: now, completedAt: null };

  const progress = await db.onboardingProgress.upsert({
    where: {
      tenantId_membershipId_tourKey_version: {
        tenantId: ctx.tenantId,
        membershipId: ctx.membershipId,
        tourKey: DASHBOARD_TOUR_KEY,
        version: DASHBOARD_TOUR_VERSION,
      },
    },
    create: {
      tenantId: ctx.tenantId,
      membershipId: ctx.membershipId,
      tourKey: DASHBOARD_TOUR_KEY,
      version: DASHBOARD_TOUR_VERSION,
      ...timestamps,
    },
    update: timestamps,
  });

  await record({
    category: "DATA",
    action: `onboarding.tour.${outcome}`,
    entityType: "OnboardingProgress",
    entityId: progress.id,
    after: { tourKey: DASHBOARD_TOUR_KEY, version: DASHBOARD_TOUR_VERSION, outcome },
  });
}

export async function resetDashboardTour(): Promise<void> {
  const ctx = requireContext();
  await db.onboardingProgress.deleteMany({
    where: {
      tenantId: ctx.tenantId,
      membershipId: ctx.membershipId,
      tourKey: DASHBOARD_TOUR_KEY,
      version: DASHBOARD_TOUR_VERSION,
    },
  });
  await record({
    category: "DATA",
    action: "onboarding.tour.reset",
    entityType: "OnboardingProgress",
    after: { tourKey: DASHBOARD_TOUR_KEY, version: DASHBOARD_TOUR_VERSION },
  });
}

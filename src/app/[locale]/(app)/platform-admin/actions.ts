"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import {
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  type PricingPlanInput,
} from "@/engines/platform-admin/pricing-service";
import {
  setContentOverride,
  clearContentOverride,
  type EditableContentKey,
} from "@/engines/platform-admin/content-service";
import {
  setSiteAsset,
  clearSiteAsset,
  type AssetSlot,
} from "@/engines/platform-admin/branding-service";
import {
  setAnnouncementBar,
  type AnnouncementBarInput,
} from "@/engines/platform-admin/announcement-service";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { reportPublicActionError } from "@/core/security/public-errors";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidatePlatformSurfaces() {
  revalidatePath("/[locale]/(app)/platform-admin", "layout");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/(auth)/login", "page");
}

export async function createPricingPlanAction(
  input: PricingPlanInput,
): Promise<ActionResult> {
  try {
    await withActionContext(() => createPricingPlan(input));
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function updatePricingPlanAction(
  id: string,
  input: PricingPlanInput,
): Promise<ActionResult> {
  try {
    await withActionContext(() => updatePricingPlan(id, input));
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function deletePricingPlanAction(id: string): Promise<ActionResult> {
  try {
    await withActionContext(() => deletePricingPlan(id));
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function setContentOverrideAction(
  key: EditableContentKey,
  locale: string,
  value: string,
): Promise<ActionResult> {
  try {
    const clean = sanitizeRichText(value);
    const isEmpty = clean.replace(/<[^>]+>/g, "").trim().length === 0;
    if (isEmpty) {
      await withActionContext(() => clearContentOverride(key, locale));
    } else {
      await withActionContext(() => setContentOverride(key, locale, clean));
    }
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function clearContentOverrideAction(
  key: EditableContentKey,
  locale: string,
): Promise<ActionResult> {
  try {
    await withActionContext(() => clearContentOverride(key, locale));
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function setAnnouncementBarAction(
  input: AnnouncementBarInput,
): Promise<ActionResult> {
  try {
    await withActionContext(() => setAnnouncementBar(input));
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

export async function setSiteAssetAction(
  slot: AssetSlot,
  url: string,
): Promise<ActionResult> {
  try {
    if (url.trim().length === 0) {
      await withActionContext(() => clearSiteAsset(slot));
    } else {
      await withActionContext(() => setSiteAsset(slot, url.trim()));
    }
    revalidatePlatformSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: reportPublicActionError(e) };
  }
}

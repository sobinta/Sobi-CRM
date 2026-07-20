import { Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { requireSuperAdmin } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { getContext } from "@/core/tenancy/context";

const SINGLETON_ID = "singleton";

export type AnnouncementAnimation = "ltr" | "rtl" | "static";

export interface AnnouncementBarInput {
  enabled: boolean;
  translations: Record<string, string>;
  backgroundColor: string;
  textColor: string;
  animation: AnnouncementAnimation;
  linkUrl: string | null;
}

/** Public read — no auth required, used by both the landing page and the app shell. */
export async function getAnnouncementBarPublic() {
  return systemDb.announcementBar.findUnique({ where: { id: SINGLETON_ID } });
}

export async function getAnnouncementBar() {
  requireSuperAdmin();
  return systemDb.announcementBar.findUnique({ where: { id: SINGLETON_ID } });
}

/** Picks the current locale's text, falling back to English. */
export function resolveAnnouncementText(
  translations: unknown,
  locale: string,
): string {
  const map = (translations ?? {}) as Record<string, string>;
  return map[locale] ?? map.en ?? "";
}

export async function setAnnouncementBar(input: AnnouncementBarInput) {
  requireSuperAdmin();
  const ctx = getContext();
  const data = {
    enabled: input.enabled,
    translations: input.translations as unknown as Prisma.InputJsonValue,
    backgroundColor: input.backgroundColor,
    textColor: input.textColor,
    animation: input.animation,
    linkUrl: input.linkUrl,
    updatedById: ctx?.membershipId,
  };
  const row = await systemDb.announcementBar.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, ...data },
    update: data,
  });
  await record({
    category: "ADMIN",
    action: "platform.announcement.update",
    entityType: "announcementBar",
    entityId: row.id,
    after: { enabled: input.enabled },
  });
  return row;
}

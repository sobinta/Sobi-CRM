"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createArticle,
  updateArticle,
  deleteArticle,
} from "@/engines/knowledge/knowledge-service";

const articleSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  tags: z.string().optional(),
});

function parseTags(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createArticleAction(input: unknown) {
  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createArticle({
      title: parsed.data.title,
      body: parsed.data.body,
      tags: parseTags(parsed.data.tags),
    }),
  );
  revalidatePath("/[locale]/(app)/crm/knowledge", "page");
  return { ok: true as const };
}

export async function updateArticleAction(id: string, input: unknown) {
  const parsed = articleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    updateArticle(id, {
      title: parsed.data.title,
      body: parsed.data.body,
      tags: parseTags(parsed.data.tags),
    }),
  );
  revalidatePath("/[locale]/(app)/crm/knowledge", "page");
  return { ok: true as const };
}

export async function deleteArticleAction(id: string) {
  await withActionContext(() => deleteArticle(id));
  revalidatePath("/[locale]/(app)/crm/knowledge", "page");
  return { ok: true as const };
}

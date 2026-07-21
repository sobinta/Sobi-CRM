"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createTemplateDefinition,
  updateTemplateDefinition,
  deleteTemplateDefinition,
} from "@/core/templates/service";
import type { TemplateKind } from "@/generated/prisma/enums";

const KINDS = [
  "EMAIL",
  "DOCUMENT",
  "NOTIFICATION",
  "REPORT",
  "PROMPT",
] as const;

const LOCALES = ["en", "de", "fa"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(KINDS),
  locale: z.enum(LOCALES),
  subject: z.string().trim().optional(),
  body: z.string().min(1),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  subject: z.string().trim().optional(),
  body: z.string().min(1),
});

function slugify(name: string): string {
  return (
    (name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "template") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export async function createTemplateAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const d = parsed.data;
  await withActionContext(() =>
    createTemplateDefinition({
      kind: d.kind as TemplateKind,
      key: slugify(d.name),
      name: d.name,
      locale: d.locale,
      subject: d.subject,
      body: d.body,
    }),
  );
  revalidatePath("/[locale]/(app)/studio/templates", "page");
  return { ok: true as const };
}

export async function updateTemplateAction(input: unknown) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const d = parsed.data;
  await withActionContext(() =>
    updateTemplateDefinition(d.id, {
      name: d.name,
      subject: d.subject,
      body: d.body,
    }),
  );
  revalidatePath("/[locale]/(app)/studio/templates", "page");
  return { ok: true as const };
}

export async function deleteTemplateAction(id: string) {
  await withActionContext(() => deleteTemplateDefinition(id));
  revalidatePath("/[locale]/(app)/studio/templates", "page");
  return { ok: true as const };
}

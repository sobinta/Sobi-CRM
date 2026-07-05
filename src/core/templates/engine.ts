import { db } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import type { TemplateKind } from "@/generated/prisma/enums";

/**
 * Universal Template Engine.
 *
 * One registry for every reusable template kind. Text templates (email,
 * document, notification) use `{{variable}}` interpolation resolved against a
 * context object; structured templates (dashboard, form, workflow) carry a
 * `definition` JSON consumed by their builder. JSON export/import here is the
 * Marketplace item format.
 */

const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function resolvePath(ctx: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, ctx);
}

/** Interpolate `{{var}}` placeholders in a text body against a context. */
export function interpolate(
  body: string,
  context: Record<string, unknown>,
): string {
  return body.replace(VAR_RE, (_m, path: string) => {
    const value = resolvePath(context, path);
    return value == null ? "" : String(value);
  });
}

export interface RenderedTemplate {
  subject?: string;
  body: string;
}

/** Load and render a text template (email/document/notification). */
export async function renderTemplate(
  kind: TemplateKind,
  key: string,
  context: Record<string, unknown>,
  opts?: { locale?: string },
): Promise<RenderedTemplate | null> {
  const ctx = getContext();
  if (!ctx) return null;

  const locale = opts?.locale ?? ctx.locale ?? "en";
  const template =
    (await db.template.findFirst({
      where: { kind, key, locale },
    })) ??
    (await db.template.findFirst({
      where: { kind, key, locale: "en" },
    }));
  if (!template || template.body == null) return null;

  const meta = (template.definition ?? {}) as { subject?: string };
  return {
    subject: meta.subject ? interpolate(meta.subject, context) : undefined,
    body: interpolate(template.body, context),
  };
}

/** Extract `{{var}}` names declared in a body (for the editor/validation). */
export function extractVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(VAR_RE)) found.add(match[1]);
  return [...found];
}

export interface TemplateExport {
  kind: TemplateKind;
  key: string;
  name: string;
  locale: string;
  body: string | null;
  definition: unknown;
  variables: unknown;
}

/** Export a template as a portable JSON object (Marketplace format). */
export async function exportTemplate(
  id: string,
): Promise<TemplateExport | null> {
  const t = await db.template.findFirst({ where: { id } });
  if (!t) return null;
  return {
    kind: t.kind,
    key: t.key,
    name: t.name,
    locale: t.locale,
    body: t.body,
    definition: t.definition,
    variables: t.variables,
  };
}

import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { extractVariables } from "./engine";
import type { TemplateKind } from "@/generated/prisma/enums";

/**
 * Template authoring service — CRUD for `Template` rows managed from
 * Studio → Templates. The Template Engine (templates/engine.ts) renders these
 * at send/print time; this service only authors the text templates
 * (email / document / notification / report / prompt). Structured kinds
 * (dashboard/form/workflow) are authored by their own builders.
 */

export interface TemplateInput {
  kind: TemplateKind;
  key: string;
  name: string;
  locale: string;
  subject?: string;
  body: string;
}

export async function listTemplateDefinitions() {
  authorize("studio.templates.read");
  return db.template.findMany({
    where: { deletedAt: null },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function createTemplateDefinition(input: TemplateInput) {
  authorize("studio.templates.update");
  const ctx = requireContext();
  const template = await db.template.create({
    data: {
      tenantId: ctx.tenantId,
      kind: input.kind,
      key: input.key,
      name: input.name,
      locale: input.locale,
      body: input.body,
      definition: (input.subject
        ? { subject: input.subject }
        : {}) as Prisma.InputJsonValue,
      variables: extractVariables(input.body) as Prisma.InputJsonValue,
    },
  });
  await record({
    category: "ADMIN",
    action: "template.create",
    entityType: "template",
    entityId: template.id,
  });
  return template;
}

export async function updateTemplateDefinition(
  id: string,
  input: Pick<TemplateInput, "name" | "subject" | "body">,
) {
  authorize("studio.templates.update");
  const template = await db.template.update({
    where: { id },
    data: {
      name: input.name,
      body: input.body,
      definition: (input.subject
        ? { subject: input.subject }
        : {}) as Prisma.InputJsonValue,
      variables: extractVariables(input.body) as Prisma.InputJsonValue,
    },
  });
  await record({
    category: "ADMIN",
    action: "template.update",
    entityType: "template",
    entityId: id,
  });
  return template;
}

export async function deleteTemplateDefinition(id: string) {
  authorize("studio.templates.update");
  await db.template.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await record({
    category: "ADMIN",
    action: "template.delete",
    entityType: "template",
    entityId: id,
  });
}

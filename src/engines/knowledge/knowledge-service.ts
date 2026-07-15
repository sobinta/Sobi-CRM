import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";

/**
 * Knowledge base — short internal articles used as the AI content-suggestion
 * skill's source material (never invented content, always grounded in a
 * real, human-authored article).
 */

export async function listArticles() {
  authorize("crm.knowledge.read");
  requireContext();
  return db.knowledgeArticle.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getArticle(id: string) {
  authorize("crm.knowledge.read");
  requireContext();
  return db.knowledgeArticle.findFirst({ where: { id } });
}

export async function createArticle(input: { title: string; body: string; tags: string[] }) {
  authorize("crm.knowledge.create");
  const ctx = requireContext();
  const article = await db.knowledgeArticle.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      body: input.body,
      tags: input.tags,
      createdById: ctx.membershipId,
    },
  });
  await record({ category: "DATA", action: "knowledge.create", entityType: "knowledgeArticle", entityId: article.id });
  return article;
}

export async function updateArticle(id: string, input: { title: string; body: string; tags: string[] }) {
  authorize("crm.knowledge.update");
  requireContext();
  const article = await db.knowledgeArticle.update({
    where: { id },
    data: { title: input.title, body: input.body, tags: input.tags },
  });
  await record({ category: "DATA", action: "knowledge.update", entityType: "knowledgeArticle", entityId: id });
  return article;
}

export async function deleteArticle(id: string) {
  authorize("crm.knowledge.delete");
  requireContext();
  await db.knowledgeArticle.delete({ where: { id } });
  await record({ category: "DATA", action: "knowledge.delete", entityType: "knowledgeArticle", entityId: id });
}

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listArticles } from "@/engines/knowledge/knowledge-service";
import { PageHeader } from "@/components/patterns/page-header";
import { KnowledgeClient, type ArticleRow } from "./knowledge-client";

export default async function KnowledgePage() {
  const [articles, t] = await Promise.all([
    withPlatformContext(() => listArticles()),
    getTranslations("knowledge"),
  ]);
  if (!articles) notFound();

  const rows: ArticleRow[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    tags: a.tags,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="knowledge" />
      <KnowledgeClient articles={rows} />
    </div>
  );
}

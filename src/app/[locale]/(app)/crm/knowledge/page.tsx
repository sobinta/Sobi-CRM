import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listArticles } from "@/engines/knowledge/knowledge-service";
import { PageHeader } from "@/components/patterns/page-header";
import { KnowledgeClient, type ArticleRow } from "./knowledge-client";

export default async function KnowledgePage() {
  const articles = await withPlatformContext(() => listArticles());
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
      <PageHeader
        title="پایگاه دانش"
        description="مقاله‌های کوتاه که دستیار AI برای پیشنهاد محتوا به لیدها از آن‌ها استفاده می‌کند."
      />
      <KnowledgeClient articles={rows} />
    </div>
  );
}

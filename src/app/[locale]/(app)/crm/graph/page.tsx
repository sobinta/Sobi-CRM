import { notFound } from "next/navigation";
import { Share2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { buildGraph } from "@/engines/graph/graph-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { GraphView } from "./graph-view";

export default async function GraphPage() {
  const [graph, t] = await Promise.all([
    withPlatformContext(() => buildGraph()),
    getTranslations("graph"),
  ]);
  if (!graph) notFound();

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="graph" />
      <div className="px-6 py-4">
        {graph.nodes.length === 0 ? (
          <EmptyState icon={Share2} title={t("emptyTitle")} description={t("emptyBody")} />
        ) : (
          <div className="mb-3 flex gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" /> {t("companies")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" /> {t("contacts")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-positive" /> {t("deals")}
            </span>
          </div>
        )}
        {graph.nodes.length > 0 && (
          <GraphView nodes={graph.nodes} edges={graph.edges} />
        )}
      </div>
    </div>
  );
}

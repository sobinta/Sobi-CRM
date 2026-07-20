import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { ImportsClient, type ImportRow } from "./imports-client";

export default async function ImportsPage() {
  const [runs, t] = await Promise.all([
    withPlatformContext(() =>
      db.importRun.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    ),
    getTranslations("imports"),
  ]);
  if (!runs) notFound();
  const rows: ImportRow[] = runs.map((run) => ({
    id: run.id,
    source: run.sourceKey.split("/").at(-1) ?? run.sourceKey,
    status: run.status,
    processedRows: run.processedRows,
    totalRows: run.totalRows,
    createdAt: run.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <ImportsClient initialRows={rows} />
    </div>
  );
}

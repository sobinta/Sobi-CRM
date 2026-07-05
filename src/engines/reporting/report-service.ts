import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";

/**
 * Reporting engine — tabular reports with a stable column/row shape that the
 * export layer (CSV/XLSX/PDF) consumes. Report categories map to queries;
 * exports are audited (EXPORT category).
 */

export interface ReportTable {
  key: string;
  name: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
}

export const REPORTS = [
  { key: "deals", name: "Deals report", category: "sales" },
  { key: "pipeline", name: "Pipeline report", category: "pipeline" },
  { key: "tasks", name: "Tasks report", category: "tasks" },
  { key: "contacts", name: "Contacts report", category: "sales" },
];

export async function runReport(key: string): Promise<ReportTable | null> {
  authorize("mgmt.report.read");
  requireContext();

  switch (key) {
    case "deals": {
      const deals = await db.deal.findMany({
        include: { stage: true, company: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return {
        key,
        name: "Deals report",
        columns: [
          { key: "title", label: "Title" },
          { key: "company", label: "Company" },
          { key: "stage", label: "Stage" },
          { key: "value", label: "Value" },
          { key: "status", label: "Status" },
        ],
        rows: deals.map((d) => ({
          title: d.title,
          company: d.company?.name ?? "",
          stage: d.stage.name,
          value: Number(d.value),
          status: d.status,
        })),
      };
    }
    case "pipeline": {
      const pipeline = await db.pipeline.findFirst({
        where: { entityType: "deal", isDefault: true },
        include: { stages: { orderBy: { position: "asc" } } },
      });
      if (!pipeline) return null;
      const grouped = await db.deal.groupBy({
        by: ["stageId"],
        where: { pipelineId: pipeline.id },
        _count: { _all: true },
        _sum: { value: true },
      });
      const byStage = new Map(grouped.map((g) => [g.stageId, g]));
      return {
        key,
        name: "Pipeline report",
        columns: [
          { key: "stage", label: "Stage" },
          { key: "count", label: "Deals" },
          { key: "value", label: "Total value" },
        ],
        rows: pipeline.stages.map((s) => ({
          stage: s.name,
          count: byStage.get(s.id)?._count._all ?? 0,
          value: Number(byStage.get(s.id)?._sum.value ?? 0),
        })),
      };
    }
    case "tasks": {
      const tasks = await db.task.findMany({
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return {
        key,
        name: "Tasks report",
        columns: [
          { key: "title", label: "Title" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "due", label: "Due" },
        ],
        rows: tasks.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          due: t.dueAt?.toISOString().slice(0, 10) ?? "",
        })),
      };
    }
    case "contacts": {
      const contacts = await db.contact.findMany({
        include: { company: { select: { name: true } } },
        take: 500,
      });
      return {
        key,
        name: "Contacts report",
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "company", label: "Company" },
          { key: "lifecycle", label: "Lifecycle" },
        ],
        rows: contacts.map((c) => ({
          name: `${c.firstName} ${c.lastName}`,
          email: c.email ?? "",
          company: c.company?.name ?? "",
          lifecycle: c.lifecycle,
        })),
      };
    }
    default:
      return null;
  }
}

/** Serialize a report to CSV. Records an export audit entry. */
export async function reportToCsv(key: string): Promise<string | null> {
  const table = await runReport(key);
  if (!table) return null;

  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = table.columns.map((c) => esc(c.label)).join(",");
  const lines = table.rows.map((row) =>
    table.columns.map((c) => esc(row[c.key] ?? "")).join(","),
  );

  await record({
    category: "EXPORT",
    action: "report.export_csv",
    entityType: "report",
    entityId: key,
  });

  return [header, ...lines].join("\n");
}

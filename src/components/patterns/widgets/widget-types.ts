import type { Kpi, PipelineBreakdown, ActivityPoint } from "@/engines/analytics/analytics-service";

/** The data bundle a dashboard needs to render all widget types. */
export interface WidgetData {
  kpis: Kpi[];
  pipeline: PipelineBreakdown[];
  trend: ActivityPoint[];
  tasks: Array<{ id: string; title: string; priority: string; dueAt: string | null }>;
  feed: Array<{ id: string; labelKey: string; type: string; actorName: string | null; occurredAt: string }>;
}

export type WidgetType =
  | "kpi"
  | "pipeline"
  | "trend"
  | "tasks"
  | "feed";

export interface LayoutItem {
  i: string; // unique id
  x: number;
  y: number;
  w: number;
  h: number;
  type: WidgetType;
  /** For kpi widgets: which KPI key to show. */
  config?: Record<string, unknown>;
}

export const WIDGET_CATALOG: Array<{
  type: WidgetType;
  name: string;
  defaultSize: { w: number; h: number };
}> = [
  { type: "kpi", name: "KPI card", defaultSize: { w: 3, h: 2 } },
  { type: "pipeline", name: "Pipeline breakdown", defaultSize: { w: 6, h: 4 } },
  { type: "trend", name: "Activity trend", defaultSize: { w: 6, h: 4 } },
  { type: "tasks", name: "My tasks", defaultSize: { w: 4, h: 5 } },
  { type: "feed", name: "Activity feed", defaultSize: { w: 4, h: 5 } },
];

"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CheckSquare, Activity } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { LayoutItem, WidgetData } from "./widget-types";

/** Renders a single dashboard widget by type from the shared data bundle. */
export function WidgetRenderer({
  item,
  data,
}: {
  item: LayoutItem;
  data: WidgetData;
}) {
  switch (item.type) {
    case "kpi":
      return <KpiWidget item={item} data={data} />;
    case "pipeline":
      return <PipelineWidget data={data} />;
    case "trend":
      return <TrendWidget data={data} />;
    case "tasks":
      return <TasksWidget data={data} />;
    case "feed":
      return <FeedWidget data={data} />;
    default:
      return null;
  }
}

function formatKpi(value: number, format: string) {
  if (format === "currency")
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  if (format === "percent") return `${value}%`;
  return new Intl.NumberFormat().format(value);
}

function KpiWidget({ item, data }: { item: LayoutItem; data: WidgetData }) {
  const key = (item.config?.kpiKey as string) ?? data.kpis[0]?.key;
  const kpi = data.kpis.find((k) => k.key === key) ?? data.kpis[0];
  if (!kpi) return null;
  return (
    <div className="flex h-full flex-col justify-center p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        {kpi.label}
      </p>
      <p className="mt-1 tabular text-3xl font-semibold text-ink">
        {formatKpi(kpi.value, kpi.format)}
      </p>
    </div>
  );
}

function PipelineWidget({ data }: { data: WidgetData }) {
  const chartData = data.pipeline.map((p) => ({
    name: p.stage,
    value: p.value,
    count: p.count,
  }));
  return (
    <WidgetFrame title="Pipeline breakdown">
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}

function TrendWidget({ data }: { data: WidgetData }) {
  const chartData = data.trend.map((p) => ({
    name: p.date.slice(5),
    value: p.count,
  }));
  return (
    <WidgetFrame title="Activity trend">
      <ResponsiveContainer width="100%" height="100%" debounce={80}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-overlay)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </WidgetFrame>
  );
}

function TasksWidget({ data }: { data: WidgetData }) {
  return (
    <WidgetFrame title="My tasks" icon={CheckSquare}>
      <ul className="space-y-1.5 overflow-y-auto">
        {data.tasks.length === 0 && (
          <li className="text-sm text-ink-faint">No open tasks.</li>
        )}
        {data.tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
            <span className="flex-1 truncate text-ink">{t.title}</span>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

function FeedWidget({ data }: { data: WidgetData }) {
  return (
    <WidgetFrame title="Activity feed" icon={Activity}>
      <ul className="space-y-2 overflow-y-auto">
        {data.feed.length === 0 && (
          <li className="text-sm text-ink-faint">No recent activity.</li>
        )}
        {data.feed.map((f) => (
          <li key={f.id} className="text-sm">
            <span className="text-ink">Someone {f.label}</span>
            <time className="ms-1.5 text-xs text-ink-faint">
              {new Date(f.occurredAt).toLocaleDateString()}
            </time>
          </li>
        ))}
      </ul>
    </WidgetFrame>
  );
}

function WidgetFrame({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof CheckSquare;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-ink-faint" />}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {title}
        </h3>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

// re-export for convenience
export { Chip };

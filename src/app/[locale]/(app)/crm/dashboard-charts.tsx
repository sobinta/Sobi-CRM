"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivityPoint } from "@/engines/analytics/analytics-service";
import type { DashboardLeadSource } from "@/engines/crm/crm-dashboard-service";
import { formatActivityDate, type ActivityCalendarMode } from "./activity-chart-calendar";

const colors = ["var(--brand)", "var(--accent)", "var(--positive)", "var(--info)", "var(--warning)"];
const tooltipStyle = { background: "var(--surface-overlay)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)", fontSize: 12 };

export function ActivityBarChart({ data, locale, calendarMode, countLabel }: { data: ActivityPoint[]; locale: string; calendarMode: ActivityCalendarMode; countLabel: string }) {
  const formatted = data.map((point) => ({
    ...point,
    label: formatActivityDate(point.date, locale, calendarMode),
  }));
  return (
    <>
      <div className="h-64 w-full" aria-hidden={data.length === 0}>
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={formatted} margin={{ top: 12, right: 8, bottom: 0, left: -20 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value), countLabel]} />
            <Bar dataKey="count" fill="var(--brand)" radius={[5, 5, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{countLabel}</caption>
        <tbody>{formatted.map((point) => <tr key={point.date}><th>{point.label}</th><td>{point.count}</td></tr>)}</tbody>
      </table>
    </>
  );
}

export function LeadSourceDonut({ data, labels, emptyLabel }: { data: DashboardLeadSource[]; labels: Record<string, string>; emptyLabel: string }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return <p className="grid h-56 place-items-center px-4 text-center text-sm text-ink-faint">{emptyLabel}</p>;

  return (
    <div className="grid min-h-56 grid-cols-[minmax(0,1fr)_minmax(116px,0.8fr)] items-center gap-2 px-3 py-2">
      <div className="relative h-48 min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <PieChart accessibilityLayer>
            <Pie data={data} dataKey="count" nameKey="source" innerRadius="52%" outerRadius="78%" paddingAngle={3} stroke="var(--surface-raised)" strokeWidth={3}>
              {data.map((item, index) => <Cell key={item.source} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, entry) => [Number(value), labels[(entry.payload as DashboardLeadSource).source] ?? (entry.payload as DashboardLeadSource).source]} />
          </PieChart>
        </ResponsiveContainer>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-center"><bdi className="text-xl font-semibold tabular-nums text-ink">{total}</bdi></span>
      </div>
      <ul className="space-y-2">
        {data.map((item, index) => (
          <li key={item.source} className="flex items-center gap-2 text-xs">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colors[index % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{labels[item.source] ?? item.source}</span>
            <span className="font-medium tabular-nums text-ink">{item.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type {
  FunnelStep,
  LeadSourceBreakdown,
  MonthlyRevenuePoint,
  PipelineBreakdown,
} from "@/engines/analytics/analytics-service";

const tooltipStyle = {
  background: "var(--surface-overlay)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  fontSize: 14,
  padding: "8px 12px",
};
const tooltipLabelStyle = { color: "var(--ink)", fontWeight: 600 };
const chartColors = ["var(--brand)", "var(--accent)", "var(--positive)", "var(--info)", "var(--warning)"];

/** Same tone vocabulary the Deals kanban and status chips use, so a stage reads the same color everywhere it appears. */
const toneColor: Record<string, string> = {
  neutral: "var(--ink-faint)",
  brand: "var(--brand)",
  accent: "var(--accent)",
  positive: "var(--positive)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

function money(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

// Axis/label type sizes are deliberately larger than Recharts' defaults — the
// previous 11px ticks were hard to read, especially in Persian.
const axisTick = { fontSize: 13, fill: "var(--ink-muted)" } as const;
const valueTick = { fontSize: 12.5, fill: "var(--ink-faint)" } as const;

export function InsightsCharts({
  funnel,
  sources,
  revenue,
  pipeline,
  labels,
}: {
  funnel: (FunnelStep & { label: string })[];
  sources: (LeadSourceBreakdown & { label: string })[];
  revenue: MonthlyRevenuePoint[];
  pipeline: (PipelineBreakdown & { label: string })[];
  labels: { funnel: string; sources: string; revenue: string; pipeline: string; count: string; noSources: string };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title={labels.funnel} className="lg:col-span-2">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={funnel} layout="vertical" margin={{ top: 8, right: 44, bottom: 0, left: 8 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={valueTick} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={axisTick} axisLine={false} tickLine={false} width={120} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              cursor={{ fill: "var(--surface-sunken)" }}
              formatter={(value, _name, entry) => [`${value} (${(entry.payload as FunnelStep & { pct: number }).pct}%)`, labels.count]}
            />
            <Bar dataKey="count" radius={[4, 4, 4, 4]}>
              {funnel.map((step, index) => (
                <Cell key={step.key} fill={chartColors[index % chartColors.length]} />
              ))}
              <LabelList dataKey="count" position="right" style={{ fill: "var(--ink-muted)", fontSize: 13, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={labels.pipeline}>
        {pipeline.length === 0 ? (
          <EmptyPlot label={labels.noSources} />
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={80}>
            <BarChart data={pipeline} layout="vertical" margin={{ top: 8, right: 56, bottom: 0, left: 8 }} accessibilityLayer>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" tick={valueTick} axisLine={false} tickLine={false} tickFormatter={money} />
              <YAxis type="category" dataKey="label" tick={axisTick} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "var(--surface-sunken)" }}
                formatter={(value, _name, entry) => [money(Number(value)), `${(entry.payload as PipelineBreakdown).count}×`]}
              />
              <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                {pipeline.map((stage) => (
                  <Cell key={stage.stageKey} fill={toneColor[stage.tone] ?? "var(--brand)"} />
                ))}
                <LabelList dataKey="value" position="right" formatter={(v) => money(Number(v))} style={{ fill: "var(--ink-muted)", fontSize: 12.5, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={labels.sources}>
        {sources.length === 0 ? (
          <EmptyPlot label={labels.noSources} />
        ) : (
          <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%" debounce={80}>
                <PieChart accessibilityLayer>
                  <Pie data={sources} dataKey="count" nameKey="label" innerRadius="52%" outerRadius="80%" paddingAngle={3} stroke="var(--surface-raised)" strokeWidth={3}>
                    {sources.map((source, index) => (
                      <Cell key={source.source} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Token-safe legend: identity carried by a colored dot + text label,
                never color alone — and readable in RTL. */}
            <ul className="flex shrink-0 flex-col gap-1.5 sm:w-40">
              {sources.map((source, index) => (
                <li key={source.source} className="flex items-center gap-2 text-sm text-ink-muted">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: chartColors[index % chartColors.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink">{source.label}</span>
                  <span className="tabular-nums font-medium text-ink">{source.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ChartCard>

      <ChartCard title={labels.revenue}>
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={revenue} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={valueTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={valueTick} axisLine={false} tickLine={false} width={48} tickFormatter={money} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              cursor={{ fill: "var(--surface-sunken)" }}
              formatter={(value) => [money(Number(value)), labels.revenue]}
            />
            <Bar dataKey="revenue" fill="var(--positive)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function EmptyPlot({ label }: { label: string }) {
  return <p className="grid h-full place-items-center text-sm text-ink-faint">{label}</p>;
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`dashboard-glow-card ${className}`}>
      <CardContent className="pt-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
        {/* Recharts computes its geometry assuming LTR; forcing the plot to LTR
            keeps axes and bars from breaking under the app's RTL direction,
            while the Persian tick labels still render right-to-left in place. */}
        <div dir="ltr" className="h-80">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

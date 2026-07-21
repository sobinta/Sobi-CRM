"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { FunnelStep, LeadSourceBreakdown, MonthlyRevenuePoint } from "@/engines/analytics/analytics-service";

const tooltipStyle = { background: "var(--surface-overlay)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 };
const chartColors = ["var(--brand)", "var(--accent)", "var(--positive)", "var(--info)", "var(--warning)"];

export function InsightsCharts({ funnel, sources, revenue, labels }: {
  funnel: FunnelStep[];
  sources: LeadSourceBreakdown[];
  revenue: MonthlyRevenuePoint[];
  labels: { funnel: string; sources: string; revenue: string; count: string; noSources: string };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-2">
      <ChartCard title={labels.funnel} className="lg:col-span-2">
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={funnel} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "var(--ink-muted)" }} axisLine={false} tickLine={false} width={90} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value, _name, entry) => [`${value} (${(entry.payload as FunnelStep).pct}%)`, labels.count]} />
            <Bar dataKey="count" radius={[4, 4, 4, 4]}>{funnel.map((step, index) => <Cell key={step.key} fill={chartColors[index % chartColors.length]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={labels.sources}>
        {sources.length === 0 ? <p className="grid h-full place-items-center text-sm text-ink-faint">{labels.noSources}</p> : (
          <ResponsiveContainer width="100%" height="100%" debounce={80}>
            <PieChart accessibilityLayer>
              <Pie data={sources} dataKey="count" nameKey="label" innerRadius="48%" outerRadius="76%" paddingAngle={3} stroke="var(--surface-raised)" strokeWidth={3}>
                {sources.map((source, index) => <Cell key={source.source} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title={labels.revenue}>
        <ResponsiveContainer width="100%" height="100%" debounce={80}>
          <BarChart data={revenue} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--ink-faint)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" fill="var(--positive)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`dashboard-glow-card ${className}`}>
      <CardContent className="pt-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
        <div className="h-72">{children}</div>
      </CardContent>
    </Card>
  );
}

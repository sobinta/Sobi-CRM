"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type {
  FunnelStep,
  LeadSourceBreakdown,
  MonthlyRevenuePoint,
} from "@/engines/analytics/analytics-service";

const tooltipStyle = {
  background: "var(--surface-overlay)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 12,
};

const FUNNEL_COLORS = [
  "var(--brand)",
  "var(--brand)",
  "var(--accent)",
  "var(--accent)",
  "var(--positive)",
];

export function InsightsCharts({
  funnel,
  sources,
  revenue,
}: {
  funnel: FunnelStep[];
  sources: LeadSourceBreakdown[];
  revenue: MonthlyRevenuePoint[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardContent>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            قیف تبدیل
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" debounce={80}>
              <BarChart
                data={funnel}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "var(--ink-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, _name, entry) => [
                    `${value} (${(entry.payload as FunnelStep).pct}%)`,
                    "تعداد",
                  ]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnel.map((s, i) => (
                    <Cell key={s.key} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            منابع لید
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={80}>
              <BarChart data={sources} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {sources.length === 0 && (
            <p className="mt-2 text-sm text-ink-faint">هنوز لیدی ثبت نشده است.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            درآمد ماهانه (۱۲ ماه اخیر، شمسی)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" debounce={80}>
              <BarChart data={revenue} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(Number(value)),
                    "درآمد",
                  ]}
                />
                <Bar dataKey="revenue" fill="var(--positive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

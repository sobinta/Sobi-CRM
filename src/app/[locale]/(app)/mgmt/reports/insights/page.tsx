import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import {
  getConversionFunnel,
  getLeadSourceBreakdown,
  getMonthlyRevenueJalali,
} from "@/engines/analytics/analytics-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Link } from "@/i18n/navigation";
import { InsightsCharts } from "./insights-charts";

export default async function InsightsPage() {
  const data = await withPlatformContext(async () => {
    const [funnel, sources, revenue] = await Promise.all([
      getConversionFunnel(),
      getLeadSourceBreakdown(),
      getMonthlyRevenueJalali(),
    ]);
    return { funnel, sources, revenue };
  });
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title="بینش‌های فروش"
        description="قیف تبدیل، منابع لید، و درآمد ماهانه."
        actions={
          <Link href="/mgmt/reports" className="text-sm text-ink-muted hover:text-ink">
            ← گزارش‌های جدولی
          </Link>
        }
      />
      <InsightsCharts funnel={data.funnel} sources={data.sources} revenue={data.revenue} />
    </div>
  );
}

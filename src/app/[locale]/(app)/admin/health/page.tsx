import { notFound } from "next/navigation";
import {
  Activity,
  Zap,
  Sparkles,
  Webhook,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getHealthSnapshot } from "@/core/observability/health-service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip, type ChipProps } from "@/components/ui/chip";

const catTone: Record<string, ChipProps["tone"]> = {
  SECURITY: "danger",
  PERMISSION: "warning",
};

export default async function HealthPage() {
  const h = await withPlatformContext(() => getHealthSnapshot());
  if (!h) notFound();

  return (
    <div>
      <PageHeader
        title="System health"
        description="Live signals from jobs, automation, AI, and integrations."
      />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: "Jobs pending", value: String(h.jobs.pending), icon: Clock, tone: h.jobs.failed > 0 ? "warning" : "neutral" },
            { label: "Automation runs (24h)", value: String(h.automation.runs24h), icon: Zap, tone: "brand" },
            { label: "AI calls (24h)", value: String(h.ai.calls24h), icon: Sparkles, tone: "info" },
            { label: "Security events (24h)", value: String(h.security.events24h), icon: ShieldAlert, tone: h.security.events24h > 0 ? "danger" : "positive" },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-ink-muted" /> Automation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Runs (24h)" value={String(h.automation.runs24h)} />
              <Row label="Failed (24h)" value={String(h.automation.failed24h)} tone={h.automation.failed24h > 0 ? "danger" : undefined} />
              <Row label="Jobs failed" value={String(h.jobs.failed)} tone={h.jobs.failed > 0 ? "danger" : undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-4 w-4 text-ink-muted" /> Integrations & AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Webhooks" value={String(h.webhooks.total)} />
              <Row label="Webhooks failing" value={String(h.webhooks.failing)} tone={h.webhooks.failing > 0 ? "warning" : undefined} />
              <Row label="AI tokens (24h)" value={h.ai.tokens24h.toLocaleString()} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-ink-muted" /> Recent security & permission events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {h.recentErrors.length === 0 ? (
              <p className="text-sm text-ink-faint">No security events. All clear.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {h.recentErrors.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2">
                      <Chip tone={catTone[e.category] ?? "neutral"}>{e.category}</Chip>
                      <code className="font-mono text-xs text-ink">{e.action}</code>
                    </span>
                    <span className="text-xs text-ink-faint">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={tone === "danger" ? "font-medium text-danger" : tone === "warning" ? "font-medium text-warning" : "tabular text-ink"}>
        {value}
      </span>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listPendingActions } from "@/engines/ai/action-center";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionCenter, type PendingAction } from "./action-center-client";

export default async function AiWorkspacePage() {
  const data = await withPlatformContext(async () => {
    const [actions, logs, setting] = await Promise.all([
      listPendingActions(),
      db.aiLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      db.aiSetting.findFirst(),
    ]);
    return { actions, logs, provider: setting?.provider ?? "mock" };
  });
  if (!data) notFound();

  const actions: PendingAction[] = data.actions.map((a) => ({
    id: a.id,
    skill: a.skill,
    summary: a.summary,
    entityType: a.entityType,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="AI"
        description="Your AI assistant proposes; you approve. Nothing changes without your sign-off."
      />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-sunken/50 px-4 py-2.5 text-sm text-ink-muted">
          <ShieldCheck className="h-4 w-4 text-positive" />
          AI provider:{" "}
          <span className="font-medium text-ink capitalize">
            {data.provider}
          </span>
          {data.provider === "mock" && (
            <span className="text-ink-faint">
              — running in keyless demo mode; add an API key in settings to use a
              real model.
            </span>
          )}
        </div>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-accent" /> Action center
          </h2>
          <ActionCenter actions={actions} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent AI activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.logs.length === 0 ? (
              <p className="text-sm text-ink-faint">
                No AI activity yet. Try &ldquo;Summarize&rdquo; on a contact.
              </p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {data.logs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2">
                    <span className="text-ink">
                      {l.skill.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {l.provider} · {l.tokensIn + l.tokensOut} tokens ·{" "}
                      {new Date(l.createdAt).toLocaleTimeString()}
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

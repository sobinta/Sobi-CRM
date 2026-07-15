import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { listApiKeys } from "@/engines/integrations/api-key-service";
import { PageHeader } from "@/components/patterns/page-header";
import {
  IntegrationsClient,
  type WebhookRow,
  type ApiKeyRow,
} from "./integrations-client";

export default async function IntegrationsPage() {
  const data = await withPlatformContext(async () => {
    const [webhooks, apiKeys] = await Promise.all([
      db.webhook.findMany({ orderBy: { createdAt: "desc" } }),
      listApiKeys(),
    ]);
    return { webhooks, apiKeys };
  });
  if (!data) notFound();

  const webhooks: WebhookRow[] = data.webhooks.map((w) => ({
    id: w.id,
    name: w.name,
    url: w.url,
    events: w.events,
    lastStatus: w.lastStatus,
  }));
  const apiKeys: ApiKeyRow[] = data.apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect SOBI CRM to other tools via webhooks and the public API."
      />
      <IntegrationsClient webhooks={webhooks} apiKeys={apiKeys} />
    </div>
  );
}

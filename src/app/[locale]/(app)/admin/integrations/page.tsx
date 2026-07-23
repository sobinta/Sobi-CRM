import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const [webhooks, apiKeys] = await Promise.all([
        db.webhook.findMany({ orderBy: { createdAt: "desc" } }),
        listApiKeys(),
      ]);
      return { webhooks, apiKeys };
    }),
    getTranslations("admin"),
  ]);
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
        title={t("integrationsTitle")}
        description={t("integrationsDesc")}
        helpTopic="integrations"
      />
      <IntegrationsClient webhooks={webhooks} apiKeys={apiKeys} />
    </div>
  );
}

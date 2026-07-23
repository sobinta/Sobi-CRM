import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/patterns/page-header";
import { AssistantClient } from "./assistant-client";

export default async function AssistantPage() {
  const t = await getTranslations("aiAssistant");
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t("title")} description={t("description")} helpTopic="aiAssistant" />
      <AssistantClient />
    </div>
  );
}

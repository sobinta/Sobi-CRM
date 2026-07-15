import { PageHeader } from "@/components/patterns/page-header";
import { AssistantClient } from "./assistant-client";

export default function AssistantPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="دستیار CRM"
        description="گفتگو با داده‌ی واقعی — لیدها، معاملات و فعالیت‌ها."
      />
      <AssistantClient />
    </div>
  );
}

import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { getContract } from "@/engines/contracts/contract-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { ContractEditorClient, type ContractDetail } from "./contract-editor-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  sent: "info",
  viewed: "warning",
  accepted: "positive",
  canceled: "danger",
};
const statusLabel: Record<string, string> = {
  draft: "پیش‌نویس",
  sent: "ارسال‌شده",
  viewed: "دیده‌شده",
  accepted: "تأییدشده",
  canceled: "لغوشده",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await withPlatformContext(() => getContract(id));
  if (!contract) notFound();

  const detail: ContractDetail = {
    id: contract.id,
    contractNo: contract.contractNo,
    bodyMd: contract.bodyMd,
    status: contract.status,
    shareToken: contract.shareToken,
    sentAt: contract.sentAt?.toISOString() ?? null,
    viewedAt: contract.viewedAt?.toISOString() ?? null,
    acceptedAt: contract.acceptedAt?.toISOString() ?? null,
    acceptedByName: contract.acceptedByName,
  };

  return (
    <div>
      <PageHeader
        title={`${contract.title} · ${contract.contractNo}`}
        actions={<Chip tone={statusTone[contract.status] ?? "neutral"}>{statusLabel[contract.status] ?? contract.status}</Chip>}
      />
      <ContractEditorClient contract={detail} />
    </div>
  );
}

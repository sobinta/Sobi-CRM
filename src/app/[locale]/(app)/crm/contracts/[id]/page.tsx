import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { getContract } from "@/engines/contracts/contract-service";
import { getContractLetterhead } from "@/engines/contracts/letterhead";
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

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const [contract, letterhead] = await Promise.all([getContract(id), getContractLetterhead()]);
      return contract ? { contract, letterhead } : null;
    }),
    getTranslations("contracts"),
  ]);
  if (!data) notFound();
  const { contract, letterhead } = data;

  const detail: ContractDetail = {
    id: contract.id,
    contractNo: contract.contractNo,
    templateKey: contract.templateKey,
    calendarMode: contract.calendarMode,
    bodyMd: contract.bodyMd,
    status: contract.status,
    shareToken: contract.shareToken,
    signedAt: contract.signedAt?.toISOString() ?? null,
    sentAt: contract.sentAt?.toISOString() ?? null,
    viewedAt: contract.viewedAt?.toISOString() ?? null,
    acceptedAt: contract.acceptedAt?.toISOString() ?? null,
    acceptedByName: contract.acceptedByName,
  };

  return (
    <div>
      <PageHeader
        title={`${contract.title} · ${contract.contractNo}`}
        actions={<Chip tone={statusTone[contract.status] ?? "neutral"}>{t(`statuses.${contract.status}`)}</Chip>}
      />
      <ContractEditorClient contract={detail} signatureReady={Boolean(letterhead.signatoryName)} />
    </div>
  );
}

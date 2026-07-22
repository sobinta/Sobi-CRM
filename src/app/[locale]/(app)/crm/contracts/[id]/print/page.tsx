import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { getContract } from "@/engines/contracts/contract-service";
import { getContractLetterhead } from "@/engines/contracts/letterhead";
import { contractQrDataUrl } from "@/engines/contracts/qr";
import { renderContractMarkdown } from "@/engines/contracts/render";
import { formatContractDate } from "@/core/i18n/jalali";
import {
  ContractDocument,
  ContractPrintStyles,
  ContractSignatureBlock,
} from "@/components/patterns/contract-document";
import { PrintToolbar } from "./print-toolbar";

export default async function ContractPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id, locale }, { mode }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("contracts"),
  ]);
  const isPreContract = mode === "pre";

  const data = await withPlatformContext(async () => {
    const [contract, letterhead] = await Promise.all([getContract(id), getContractLetterhead()]);
    return contract ? { contract, letterhead } : null;
  });
  if (!data) notFound();
  const { contract, letterhead } = data;

  const html = renderContractMarkdown(contract.bodyMd);
  const publicUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/contract/${contract.shareToken}`
      : `/${locale}/contract/${contract.shareToken}`;

  const showSignature = !isPreContract && contract.signedAt && letterhead.signatoryName;
  const qrDataUrl = showSignature ? await contractQrDataUrl(publicUrl) : null;

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <ContractPrintStyles />
      <PrintToolbar contractId={contract.id} />
      <main className="mx-auto max-w-3xl px-6 pb-10">
        {!isPreContract && !contract.signedAt && (
          <p className="no-print mb-4 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-xs text-warning-subtle-ink">
            {t("printUnsignedNotice")}
          </p>
        )}
        <ContractDocument
          bodyHtml={html}
          headerTitle={
            isPreContract ? `${t("preContractTitlePrefix")} ${contract.contractNo}` : `قرارداد ${contract.contractNo}`
          }
          companyName={letterhead.companyName}
          logoUrl={letterhead.logoUrl}
          addressLine={letterhead.addressLine}
          footerText={letterhead.footerText}
          watermarkLabel={isPreContract ? t("preContractWatermark") : null}
        >
          {showSignature && qrDataUrl && (
            <ContractSignatureBlock
              qrDataUrl={qrDataUrl}
              signatoryName={letterhead.signatoryName as string}
              signatoryTitle={letterhead.signatoryTitle}
              signedAtLabel={formatContractDate(contract.signedAt as Date, contract.calendarMode)}
              verifyHref={publicUrl}
              signedByLabel={t("signedBy")}
              scanLabel={t("scanToVerify")}
              linkLabel={t("orOpenLink")}
            />
          )}
        </ContractDocument>
      </main>
    </div>
  );
}

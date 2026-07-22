import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  getContractByToken,
  markContractViewed,
} from "@/engines/contracts/contract-service";
import { getContractLetterheadPublic } from "@/engines/contracts/letterhead";
import { contractQrDataUrl } from "@/engines/contracts/qr";
import { renderContractMarkdown } from "@/engines/contracts/render";
import { formatContractDate } from "@/core/i18n/jalali";
import { Logo } from "@/components/brand/logo";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import {
  ContractDocument,
  ContractPrintStyles,
  ContractSignatureBlock,
} from "@/components/patterns/contract-document";
import { AcceptForm } from "./accept-form";
import { headers } from "next/headers";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { isContractShareToken } from "@/core/security/public-tokens";

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token, locale } = await params;
  if (!isContractShareToken(token)) notFound();
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const throttle = await limit(rateLimitKey("contract-view", `${token}:${address}`), {
    max: 30,
    windowMs: 15 * 60_000,
  });
  if (!throttle.ok) notFound();
  const [contract, assets, t] = await Promise.all([
    getContractByToken(token),
    getSiteAssetsPublic(),
    getTranslations("publicContract"),
  ]);
  if (!contract || contract.status === "draft") notFound();

  // First client view flips sent → viewed. Must be awaited: on a serverless
  // platform, an un-awaited write started during render can be cut off the
  // moment the response finishes streaming, before the DB write completes.
  await markContractViewed(token);

  const letterhead = await getContractLetterheadPublic(contract.tenantId);
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const publicUrl = `${proto}://${requestHeaders.get("host") ?? ""}/${locale}/contract/${contract.shareToken}`;

  const html = renderContractMarkdown(contract.bodyMd);

  return (
    <div className="min-h-dvh bg-surface-sunken">
      <ContractPrintStyles />

      {/* Brand header */}
      <header className="no-print bg-brand px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center">
          <Logo size={26} tone="on-dark" src={assets.logo} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">قرارداد {contract.contractNo}</h1>
        </div>

        <div className="mb-6">
          <ContractDocument
            bodyHtml={html}
            headerTitle={`قرارداد ${contract.contractNo}`}
            companyName={letterhead.companyName}
            logoUrl={letterhead.logoUrl}
            addressLine={letterhead.addressLine}
            footerText={letterhead.footerText}
          >
            {contract.signedAt && letterhead.signatoryName && (
              <ContractSignatureBlockAsync
                publicUrl={publicUrl}
                signatoryName={letterhead.signatoryName}
                signatoryTitle={letterhead.signatoryTitle}
                signedAt={contract.signedAt}
                calendarMode={contract.calendarMode}
                signedByLabel={t("signedBy")}
                scanLabel={t("scanToVerify")}
                linkLabel={t("orOpenLink")}
              />
            )}
          </ContractDocument>
        </div>

        <AcceptForm
          token={contract.shareToken}
          contractNo={contract.contractNo}
          alreadyAccepted={contract.status === "accepted"}
          acceptedByName={contract.acceptedByName}
        />
      </main>
    </div>
  );
}

async function ContractSignatureBlockAsync({
  publicUrl,
  signatoryName,
  signatoryTitle,
  signedAt,
  calendarMode,
  signedByLabel,
  scanLabel,
  linkLabel,
}: {
  publicUrl: string;
  signatoryName: string;
  signatoryTitle: string | null;
  signedAt: Date;
  calendarMode: string;
  signedByLabel: string;
  scanLabel: string;
  linkLabel: string;
}) {
  const qrDataUrl = await contractQrDataUrl(publicUrl);
  return (
    <ContractSignatureBlock
      qrDataUrl={qrDataUrl}
      signatoryName={signatoryName}
      signatoryTitle={signatoryTitle}
      signedAtLabel={formatContractDate(signedAt, calendarMode)}
      verifyHref={publicUrl}
      signedByLabel={signedByLabel}
      scanLabel={scanLabel}
      linkLabel={linkLabel}
    />
  );
}

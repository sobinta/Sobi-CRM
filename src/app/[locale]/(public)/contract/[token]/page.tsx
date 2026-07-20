import { notFound } from "next/navigation";
import {
  getContractByToken,
  markContractViewed,
} from "@/engines/contracts/contract-service";
import { renderContractMarkdown } from "@/engines/contracts/render";
import { Logo } from "@/components/brand/logo";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import { AcceptForm } from "./accept-form";
import { headers } from "next/headers";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { isContractShareToken } from "@/core/security/public-tokens";

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isContractShareToken(token)) notFound();
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const throttle = limit(rateLimitKey("contract-view", `${token}:${address}`), {
    max: 30,
    windowMs: 15 * 60_000,
  });
  if (!throttle.ok) notFound();
  const [contract, assets] = await Promise.all([
    getContractByToken(token),
    getSiteAssetsPublic(),
  ]);
  if (!contract || contract.status === "draft") notFound();

  // First client view flips sent → viewed. Must be awaited: on a serverless
  // platform, an un-awaited write started during render can be cut off the
  // moment the response finishes streaming, before the DB write completes.
  await markContractViewed(token);

  const html = renderContractMarkdown(contract.bodyMd);

  return (
    <div className="min-h-dvh bg-surface-sunken">
      {/* Print styling: hide the action bar, use a clean white page. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              body { background: white !important; }
            }
            .contract-doc h1 { font-size: 1.375rem; font-weight: 700; margin: 1.25rem 0 0.75rem; }
            .contract-doc h2 { font-size: 1.1rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
            .contract-doc p { margin: 0.5rem 0; line-height: 1.9; }
            .contract-doc hr { margin: 1.5rem 0; border-color: var(--line); }
            .contract-doc blockquote { border-inline-start: 3px solid var(--brand); padding-inline-start: 0.75rem; color: var(--ink-muted); margin: 0.75rem 0; }
            .contract-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.875rem; }
            .contract-table th, .contract-table td { border: 1px solid var(--line); padding: 0.5rem 0.75rem; text-align: start; }
            .contract-table th { background: var(--surface-sunken); }
          `,
        }}
      />

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

        <div className="mb-6 rounded-xl border border-line bg-surface-raised p-6 shadow-raised sm:p-10">
          <div
            className="contract-doc text-sm text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>

        <AcceptForm
          token={contract.shareToken}
          alreadyAccepted={contract.status === "accepted"}
          acceptedByName={contract.acceptedByName}
        />
      </main>
    </div>
  );
}

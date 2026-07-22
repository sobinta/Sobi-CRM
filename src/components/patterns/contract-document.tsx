import type { ReactNode } from "react";

/** Shared print stylesheet for the rendered contract body — used by both the public share page and the authenticated PDF preview. */
export function ContractPrintStyles() {
  return (
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
  );
}

/**
 * The rendered contract page itself: letterhead header (logo/company/address),
 * the document body, an optional diagonal watermark (pre-contract review
 * copies), and an optional signature block passed as children.
 */
export function ContractDocument({
  bodyHtml,
  headerTitle,
  companyName,
  logoUrl,
  addressLine,
  footerText,
  watermarkLabel,
  children,
}: {
  bodyHtml: string;
  headerTitle: string;
  companyName: string;
  logoUrl: string | null;
  addressLine: string | null;
  footerText: string | null;
  watermarkLabel?: string | null;
  children?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface-raised p-6 shadow-raised sm:p-10">
      {watermarkLabel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
        >
          <span className="whitespace-nowrap text-6xl font-extrabold uppercase tracking-widest text-ink/[0.06] sm:text-8xl [transform:rotate(-28deg)]">
            {watermarkLabel}
          </span>
        </div>
      )}
      <div className="relative">
        <div className="mb-6 flex items-center gap-3 border-b border-line pb-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- tenant-supplied external logo URL, not a static asset
            <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-contain" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{companyName}</p>
            {addressLine && <p className="truncate text-xs text-ink-faint">{addressLine}</p>}
          </div>
        </div>
        <h1 className="mb-5 text-lg font-semibold text-ink">{headerTitle}</h1>
        <div className="contract-doc text-sm text-ink" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        {children}
        {footerText && (
          <p className="mt-8 border-t border-line pt-4 text-center text-xs text-ink-faint">{footerText}</p>
        )}
      </div>
    </div>
  );
}

export function ContractSignatureBlock({
  qrDataUrl,
  signatoryName,
  signatoryTitle,
  signedAtLabel,
  verifyHref,
  signedByLabel,
  scanLabel,
  linkLabel,
}: {
  qrDataUrl: string;
  signatoryName: string;
  signatoryTitle: string | null;
  signedAtLabel: string;
  verifyHref: string;
  signedByLabel: string;
  scanLabel: string;
  linkLabel: string;
}) {
  return (
    <div className="mt-8 flex flex-col items-start gap-4 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs text-ink-faint">{signedByLabel}</p>
        <p className="mt-1 text-base font-semibold text-ink italic">{signatoryName}</p>
        {signatoryTitle && <p className="text-xs text-ink-muted">{signatoryTitle}</p>}
        <p className="mt-1 text-xs text-ink-faint">{signedAtLabel}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- locally-generated data: URL, not a static asset */}
        <img src={qrDataUrl} alt="" className="h-24 w-24 rounded border border-line bg-white p-1" />
        <p className="text-[11px] text-ink-faint">{scanLabel}</p>
        <a href={verifyHref} className="text-[11px] text-brand hover:underline" dir="ltr">
          {linkLabel}
        </a>
      </div>
    </div>
  );
}

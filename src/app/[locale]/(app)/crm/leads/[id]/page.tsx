import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getLead } from "@/engines/crm/lead-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Link } from "@/i18n/navigation";
import { Chip } from "@/components/ui/chip";
import { LEAD_STATUS_TONE } from "@/engines/crm/lead-format";
import { ConvertLeadDialog } from "../convert-lead-dialog";
import { LeadDetailClient } from "./lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await withPlatformContext(() => getLead(id));
  if (!lead) notFound();

  const t = await getTranslations("leads");
  const custom = (lead.customFields ?? {}) as { message?: string; name?: string };
  const isConverted = lead.status === "converted" && lead.contactId;

  return (
    <div>
      <PageHeader
        title={lead.title}
        description={`${t(`sources.${lead.source ?? "unknown"}` as never)} · ${new Date(lead.createdAt).toLocaleDateString()}`}
        helpTopic="leads"
        actions={
          <>
            <Chip tone={LEAD_STATUS_TONE[lead.status] ?? "neutral"}>
              {t(`status.${lead.status}` as never)}
            </Chip>
            {isConverted ? (
              <Link
                href={`/crm/contacts/${lead.contactId}`}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink hover:border-line-strong sm:h-8 sm:text-xs"
              >
                <Eye className="h-3.5 w-3.5" /> {t("viewContact")}
              </Link>
            ) : (
              <ConvertLeadDialog
                lead={{
                  id: lead.id,
                  title: lead.title,
                  companyName: lead.companyName,
                  industry: lead.industry,
                  email: lead.email,
                  phone: lead.phone,
                  estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
                }}
              />
            )}
          </>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <p className="mb-4 text-xs text-ink-faint">
          <Link href="/crm/leads" className="hover:text-ink-muted">
            ← {t("backToLeads")}
          </Link>
        </p>

        {isConverted && (
          <div className="mb-4 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
            {t("convertedBanner")}
          </div>
        )}

        <LeadDetailClient
          lead={{
            id: lead.id,
            title: lead.title,
            companyName: lead.companyName,
            industry: lead.industry,
            email: lead.email,
            phone: lead.phone,
            status: lead.status,
            source: lead.source,
            score: lead.score,
            scoreRationale: lead.scoreRationale,
            estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : null,
            message: custom.message ?? null,
            createdAt: lead.createdAt.toISOString(),
          }}
        />
      </div>
    </div>
  );
}

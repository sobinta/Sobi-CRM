import { notFound } from "next/navigation";
import { Mail, Phone, Briefcase, Building2, BrainCircuit, Tag, CalendarClock, Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { db } from "@/core/db";
import { getContact, getContactFullTimeline } from "@/engines/crm/contact-service";
import { contactEntity } from "@/engines/crm/entities";
import { resolveOptionChip } from "@/engines/crm/field-chips";
import { PageHeader } from "@/components/patterns/page-header";
import { TimelinePanel } from "@/components/patterns/timeline-panel";
import { NoteComposer } from "@/components/patterns/note-composer";
import { AddActivityDialog } from "@/components/patterns/add-activity-dialog";
import { ContactAiPanel } from "./ai-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Link } from "@/i18n/navigation";
import { Sparkles } from "lucide-react";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const contact = await getContact(id);
      if (!contact) return null;
      const [timeline, conversation] = await Promise.all([
        getContactFullTimeline(id, contact.leadId),
        db.conversation.findFirst({
          where: {
            OR: [
              { contactId: id },
              ...(contact.conversationId ? [{ externalId: contact.conversationId }] : []),
            ],
          },
          orderBy: { startedAt: "desc" },
        }),
      ]);
      return { contact, timeline, conversation };
    }),
    getTranslations("contactDetail"),
  ]);

  if (!data || !data.contact) notFound();
  const { contact, timeline, conversation } = data;
  const chip = resolveOptionChip(contactEntity, "lifecycle", contact.lifecycle);
  const custom = (contact.customFields ?? {}) as { serviceInterest?: string };

  return (
    <div>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={contact.jobTitle ?? undefined}
        helpTopic="contacts"
        actions={<Chip tone={chip.tone}>{chip.label}</Chip>}
      />

      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 sm:pt-6">
        <p className="mb-3 text-xs text-ink-faint">
          <Link href="/crm/contacts" className="hover:text-ink-muted">
            ← {t("backToContacts")}
          </Link>
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl gap-5 px-4 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Details */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("detailsTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow icon={Mail} label={t("emailLabel")} value={contact.email} dir="ltr" />
              <DetailRow icon={Phone} label={t("phoneLabel")} value={contact.phone} dir="ltr" />
              <DetailRow icon={Briefcase} label={t("jobTitleLabel")} value={contact.jobTitle} />
              <DetailRow
                icon={Building2}
                label={t("companyLabel")}
                value={contact.company?.name}
              />
              {!contact.company && custom.serviceInterest && (
                <DetailRow icon={Tag} label={t("serviceInterestLabel")} value={custom.serviceInterest} />
              )}
              <DetailRow
                icon={Layers}
                label={t("sourceLabel")}
                value={contact.source ?? undefined}
              />
              <DetailRow
                icon={CalendarClock}
                label={t("registeredLabel")}
                value={new Date(contact.createdAt).toLocaleDateString()}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-accent" /> {t("aiKnowledgeTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.aiSummary ? (
                <div className="whitespace-pre-wrap text-sm text-ink">
                  {contact.aiSummary}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">{t("aiKnowledgeEmpty")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> {t("aiAssistantTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactAiPanel
                contactId={contact.id}
                hasConversation={Boolean(conversation)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("addNoteTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <NoteComposer entityType="contact" entityId={contact.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("privacyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-ink-muted">{t("privacyDescription")}</p>
              <a
                href={`/api/v1/gdpr/contacts/${contact.id}/export`}
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink hover:border-line-strong sm:h-8.5"
              >
                {t("exportData")}
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>{t("timelineTitle")}</CardTitle>
            <AddActivityDialog entityType="contact" entityId={contact.id} />
          </CardHeader>
          <CardContent>
            <TimelinePanel items={timeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof Mail;
  label: string;
  value?: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
      <span className="w-28 shrink-0 text-ink-faint">{label}</span>
      <span className="truncate text-ink" dir={dir}>
        {value || "—"}
      </span>
    </div>
  );
}

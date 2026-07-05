import { notFound } from "next/navigation";
import { Mail, Phone, Briefcase, Building2 } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { getContact } from "@/engines/crm/contact-service";
import { getTimeline } from "@/engines/timeline/timeline";
import { contactEntity } from "@/engines/crm/entities";
import { resolveOptionChip } from "@/engines/crm/field-chips";
import { PageHeader } from "@/components/patterns/page-header";
import { TimelinePanel } from "@/components/patterns/timeline-panel";
import { NoteComposer } from "@/components/patterns/note-composer";
import { ContactAiPanel } from "./ai-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Sparkles } from "lucide-react";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await withPlatformContext(async () => {
    const contact = await getContact(id);
    if (!contact) return null;
    const timeline = await getTimeline("contact", id);
    return { contact, timeline };
  });

  if (!data || !data.contact) notFound();
  const { contact, timeline } = data;
  const chip = resolveOptionChip(contactEntity, "lifecycle", contact.lifecycle);

  return (
    <div>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={contact.jobTitle ?? undefined}
        actions={<Chip tone={chip.tone}>{chip.label}</Chip>}
      />

      <div className="mx-auto grid max-w-5xl gap-5 px-6 py-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Details */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow icon={Mail} label="Email" value={contact.email} dir="ltr" />
              <DetailRow icon={Phone} label="Phone" value={contact.phone} dir="ltr" />
              <DetailRow
                icon={Briefcase}
                label="Job title"
                value={contact.jobTitle}
              />
              <DetailRow
                icon={Building2}
                label="Company"
                value={contact.company?.name}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" /> AI assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContactAiPanel contactId={contact.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add note</CardTitle>
            </CardHeader>
            <CardContent>
              <NoteComposer entityType="contact" entityId={contact.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy (GDPR)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-ink-muted">
                Export or erase all personal data held about this contact.
              </p>
              <a
                href={`/api/v1/gdpr/contacts/${contact.id}/export`}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink hover:border-line-strong"
              >
                Export data (JSON)
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
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
      <span className="w-20 shrink-0 text-ink-faint">{label}</span>
      <span className="truncate text-ink" dir={dir}>
        {value || "—"}
      </span>
    </div>
  );
}

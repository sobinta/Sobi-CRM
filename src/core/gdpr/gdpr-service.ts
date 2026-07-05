import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";

/**
 * GDPR service — data subject rights. Export bundles all data held about a
 * contact into a portable JSON object; deletion anonymizes the record and its
 * traces (keeping referential integrity) rather than hard-deleting, and logs
 * the request. All actions are audited under the DATA/EXPORT categories.
 */

export async function exportContactData(contactId: string) {
  authorize("crm.contact.export");
  const ctx = requireContext();

  const contact = await db.contact.findFirst({
    where: { id: contactId },
    include: { company: { select: { name: true } } },
  });
  if (!contact) return null;

  const [notes, activities, tasks, files, consents, deals] = await Promise.all([
    db.note.findMany({ where: { entityType: "contact", entityId: contactId } }),
    db.activity.findMany({ where: { entityType: "contact", entityId: contactId } }),
    db.task.findMany({ where: { entityType: "contact", entityId: contactId } }),
    db.fileObject.findMany({ where: { entityType: "contact", entityId: contactId } }),
    db.consentRecord.findMany({ where: { entityType: "contact", entityId: contactId } }),
    db.deal.findMany({ where: { contactId } }),
  ]);

  await Promise.all([
    db.dataRequest.create({
      data: {
        tenantId: ctx.tenantId,
        kind: "export",
        subjectType: "contact",
        subjectId: contactId,
        subjectLabel: `${contact.firstName} ${contact.lastName}`,
        status: "completed",
        requestedBy: ctx.membershipId,
        completedAt: new Date(),
        result: "Exported as JSON",
      },
    }),
    record({
      category: "EXPORT",
      action: "gdpr.export",
      entityType: "contact",
      entityId: contactId,
    }),
  ]);

  return {
    subject: contact,
    notes,
    activities,
    tasks,
    files: files.map((f) => ({ name: f.name, size: f.size, createdAt: f.createdAt })),
    consents,
    deals: deals.map((d) => ({ title: d.title, value: d.value, status: d.status })),
    exportedAt: new Date().toISOString(),
  };
}

/** Right to erasure — anonymize the contact and its notes; keep the shell for
 *  referential integrity, remove personal data, and log the request. */
export async function deleteContactData(contactId: string): Promise<{ ok: boolean }> {
  authorize("crm.contact.delete");
  const ctx = requireContext();

  const contact = await db.contact.findFirst({ where: { id: contactId } });
  if (!contact) return { ok: false };

  await db.contact.update({
    where: { id: contactId },
    data: {
      firstName: "Redacted",
      lastName: "Contact",
      email: null,
      phone: null,
      jobTitle: null,
      customFields: {},
      lifecycle: "inactive",
      deletedAt: new Date(),
    },
  });
  // Anonymize free-text notes that may contain personal data.
  await db.note.updateMany({
    where: { entityType: "contact", entityId: contactId },
    data: { body: "[redacted per erasure request]" },
  });

  await Promise.all([
    db.dataRequest.create({
      data: {
        tenantId: ctx.tenantId,
        kind: "deletion",
        subjectType: "contact",
        subjectId: contactId,
        subjectLabel: `${contact.firstName} ${contact.lastName}`,
        status: "completed",
        requestedBy: ctx.membershipId,
        completedAt: new Date(),
        result: "Anonymized",
      },
    }),
    record({
      category: "DATA",
      action: "gdpr.erasure",
      entityType: "contact",
      entityId: contactId,
    }),
  ]);

  return { ok: true };
}

export async function listDataRequests() {
  authorize("admin.gdpr.read");
  return db.dataRequest.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

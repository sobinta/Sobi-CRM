import { z } from "zod";
import { db, Prisma } from "@/core/db";
import { enqueue } from "@/core/jobs/runner";
import { authorize } from "@/core/rbac/guard";
import { requireContext } from "@/core/tenancy/context";
import { validateUpload } from "@/core/security/upload-policy";
import { assertRecordQuota } from "@/core/billing/quota";
import { makeStorageKey, storage } from "@/engines/files/storage";
import { normalizeContactMapping, parseCsv, type ContactImportField } from "./csv";

const contactRow = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  jobTitle: z.string().trim().max(160).optional(),
  lifecycle: z.string().trim().max(40).optional(),
  source: z.string().trim().max(80).optional(),
});

export async function startContactImport(input: {
  filename: string;
  data: Buffer;
  mapping?: Record<string, string>;
}) {
  authorize("crm.contact.create");
  const ctx = requireContext();
  if (input.data.length > 5 * 1024 * 1024) throw new Error("Import file is too large.");
  const validated = validateUpload(
    { filename: input.filename, mimeType: "text/csv", size: input.data.length },
    input.data,
  );
  const sourceKey = makeStorageKey(ctx.tenantId, `imports-${validated.filename}`);
  await storage.put(sourceKey, input.data);
  const run = await db.importRun.create({
    data: {
      tenantId: ctx.tenantId,
      entityType: "contact",
      sourceKey,
      mapping: (input.mapping ?? {}) as Prisma.InputJsonValue,
      createdById: ctx.membershipId,
    },
  }).catch(async (error) => {
    await storage.delete(sourceKey).catch(() => undefined);
    throw error;
  });
  await enqueue({
    kind: "imports.contacts",
    tenantId: ctx.tenantId,
    payload: { importRunId: run.id },
    dedupeKey: `import:${run.id}`,
    maxAttempts: 3,
  });
  return run;
}

export async function processContactImport(importRunId: string): Promise<void> {
  const run = await db.importRun.findFirst({ where: { id: importRunId } });
  if (!run) throw new Error("Import run not found.");
  if (["SUCCEEDED", "PARTIAL"].includes(run.status)) return;
  await db.importRun.update({ where: { id: run.id }, data: { status: "RUNNING", startedAt: new Date() } });

  try {
    const source = await storage.get(run.sourceKey);
    const rows = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(source));
    const mapping = normalizeContactMapping(rows[0], run.mapping);
    const valid: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; code: string }> = [];
    for (let index = 1; index < rows.length; index += 1) {
      const raw: Partial<Record<ContactImportField, string>> = {};
      for (const [field, column] of Object.entries(mapping)) {
        raw[field as ContactImportField] = rows[index][column] ?? "";
      }
      const parsed = contactRow.safeParse(raw);
      if (!parsed.success) {
        if (errors.length < 100) errors.push({ row: index + 1, code: "validation_failed" });
        continue;
      }
      valid.push({
        ...parsed.data,
        email: parsed.data.email || null,
        tenantId: run.tenantId,
        importRunId: run.id,
        importRow: index + 1,
        createdById: run.createdById,
        ownerId: run.createdById,
      });
    }
    const existing = await db.contact.count();
    await assertRecordQuota("contacts", existing, valid.length);
    if (valid.length) {
      await db.contact.createMany({ data: valid as never[], skipDuplicates: true });
    }
    const succeeded = valid.length;
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: errors.length ? "PARTIAL" : "SUCCEEDED",
        totalRows: rows.length - 1,
        processedRows: rows.length - 1,
        succeededRows: succeeded,
        failedRows: errors.length,
        errors: errors as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        errors: [{ row: 0, code: "processing_failed" }],
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

"use server";

import { withActionContext } from "@/core/auth/action-context";
import { assertUploadEnvelope } from "@/core/security/upload-policy";
import { startContactImport } from "@/engines/imports/contact-import";

export async function startContactImportAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const };
  try {
    assertUploadEnvelope({
      filename: file.name,
      mimeType: file.type || "text/csv",
      size: file.size,
    });
    if (file.size > 5 * 1024 * 1024) return { ok: false as const };
  } catch {
    return { ok: false as const };
  }

  let mapping: Record<string, string> | undefined;
  const rawMapping = formData.get("mapping");
  if (typeof rawMapping === "string" && rawMapping.length <= 4_000) {
    try {
      const parsed = JSON.parse(rawMapping);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        mapping = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>)
            .filter(([, value]) => typeof value === "string")
            .slice(0, 20),
        ) as Record<string, string>;
      }
    } catch {
      return { ok: false as const };
    }
  }

  const run = await withActionContext(
    async () =>
      startContactImport({
        filename: file.name,
        data: Buffer.from(await file.arrayBuffer()),
        mapping,
      }),
    { permission: "crm.contact.create" },
  );
  return { ok: true as const, importRunId: run.id };
}

import { notFound } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listFiles } from "@/engines/files/file-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { UploadButton } from "./files-client";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function FilesPage() {
  const files = await withPlatformContext(() => listFiles());
  if (!files) notFound();

  return (
    <div>
      <PageHeader
        title="Files"
        description={`${files.length} ${files.length === 1 ? "file" : "files"}`}
        actions={<UploadButton />}
      />
      <div className="px-6 py-4">
        {files.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No files yet"
            description="Upload documents to keep them secure and organized."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">Name</th>
                  <th className="px-4 py-2.5 text-start font-medium">Type</th>
                  <th className="px-4 py-2.5 text-start font-medium">Size</th>
                  <th className="px-4 py-2.5 text-start font-medium">Uploaded</th>
                  <th className="px-4 py-2.5 text-end font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {files.map((f) => (
                  <tr key={f.id} className="bg-surface-raised">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5 font-medium text-ink">
                        <FileText className="h-4 w-4 text-ink-faint" />
                        {f.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{f.mimeType}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {formatSize(f.size)}
                    </td>
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <a
                        href={`/api/v1/files/${f.id}/download`}
                        className="inline-flex items-center gap-1 text-brand hover:text-brand-hover"
                      >
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

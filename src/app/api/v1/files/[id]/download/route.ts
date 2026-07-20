import { NextResponse } from "next/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { readFileForDownload } from "@/engines/files/file-service";

/**
 * Secure file download. Runs inside the caller's PlatformContext so tenant
 * isolation + the ops.file.read permission are enforced, and the download is
 * audited. Files are never served from a public static path.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = await withPlatformContext(() => readFileForDownload(id));
  if (result === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { file, data } = result;
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.name)}"`,
      "Content-Length": String(file.size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

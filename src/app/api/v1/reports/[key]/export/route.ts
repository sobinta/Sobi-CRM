import { NextResponse } from "next/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { reportToCsv } from "@/engines/reporting/report-service";

/** Export a report as CSV. Permission + audit handled in the service. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const csv = await withPlatformContext(() => reportToCsv(key));
  if (csv === null) {
    return NextResponse.json({ error: "unavailable" }, { status: 404 });
  }
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${key}-report.csv"`,
    },
  });
}

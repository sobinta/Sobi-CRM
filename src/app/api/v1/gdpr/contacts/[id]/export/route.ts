import { NextResponse } from "next/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { exportContactData } from "@/core/gdpr/gdpr-service";

/** GDPR data export — downloads all data held about a contact as JSON. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bundle = await withPlatformContext(() => exportContactData(id));
  if (bundle === null) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="contact-${id}-data.json"`,
    },
  });
}

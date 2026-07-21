import { redirect } from "next/navigation";
import { legacyManagementRedirect } from "@/core/module-registry/legacy-management-routes";

export default async function LegacyActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(legacyManagementRedirect(locale, "activity"));
}

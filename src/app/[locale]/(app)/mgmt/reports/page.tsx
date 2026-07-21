import { redirect } from "next/navigation";
import { legacyManagementRedirect } from "@/core/module-registry/legacy-management-routes";

export default async function LegacyReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const [{ locale }, { r }] = await Promise.all([params, searchParams]);
  redirect(legacyManagementRedirect(locale, "reports", { r }));
}

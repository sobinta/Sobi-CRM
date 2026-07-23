import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

/**
 * The visual insights used to live on their own page reached via a link. They
 * are now the default view of `/crm/reports`, so this route just forwards there
 * (keeps old links/bookmarks working). The charts component itself still lives
 * in this folder and is imported by the reports page.
 */
export default async function InsightsRedirect() {
  const locale = await getLocale();
  redirect({ href: "/crm/reports?view=visual", locale });
}

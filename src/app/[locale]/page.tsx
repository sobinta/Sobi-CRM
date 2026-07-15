import { redirect } from "@/i18n/navigation";
import { resolveSession } from "@/core/auth/session";
import { LandingPage } from "./landing/landing-page";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await resolveSession();
  if (session) {
    redirect({ href: "/crm", locale });
  }
  return <LandingPage />;
}

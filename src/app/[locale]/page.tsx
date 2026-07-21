import { redirect } from "@/i18n/navigation";
import { resolveSession } from "@/core/auth/session";
import { getPublicDemoConfig } from "@/core/demo/config";
import { LandingPage } from "./landing/landing-page";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await resolveSession();
  if (session && !session.isSuperAdmin) {
    redirect({ href: "/crm", locale });
  }
  return (
    <LandingPage
      editMode={session?.isSuperAdmin ?? false}
      demoEnabled={getPublicDemoConfig().enabled}
    />
  );
}

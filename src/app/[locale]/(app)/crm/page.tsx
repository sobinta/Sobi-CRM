import { notFound } from "next/navigation";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { getCrmDashboardData } from "@/engines/crm/crm-dashboard-service";
import { CrmDashboard } from "./crm-dashboard";

export default async function CrmDashboardPage() {
  const [session, data] = await Promise.all([
    resolveSession(),
    withPlatformContext(() => getCrmDashboardData()),
  ]);
  if (!session?.active || !data) notFound();

  return (
    <CrmDashboard
      data={data}
      firstName={session.name.split(/\s+/)[0] ?? ""}
      tenantName={session.active.tenantName}
    />
  );
}

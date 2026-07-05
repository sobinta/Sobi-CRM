import { notFound } from "next/navigation";
import { getPublicTenant } from "@/engines/portal/portal-service";
import { PublicLeadForm } from "./lead-form";

export default async function PublicLeadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tenant = await getPublicTenant(slug);
  if (!tenant) notFound();

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {tenant.name}
        </h1>
      </div>
      <PublicLeadForm tenantSlug={tenant.slug} tenantName={tenant.name} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listContracts } from "@/engines/contracts/contract-service";
import { db } from "@/core/db";
import { PageHeader } from "@/components/patterns/page-header";
import { ContractsClient, type ContractRow, type ContactOption } from "./contracts-client";

export default async function ContractsPage() {
  const data = await withPlatformContext(async () => {
    const [contracts, contacts] = await Promise.all([
      listContracts(),
      db.contact.findMany({ select: { id: true, firstName: true, lastName: true }, take: 200 }),
    ]);
    return { contracts, contacts };
  });
  if (!data) notFound();

  const rows: ContractRow[] = data.contracts.map((c) => ({
    id: c.id,
    contractNo: c.contractNo,
    title: c.title,
    amount: Number(c.amount),
    currency: c.currency,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }));
  const contactOptions: ContactOption[] = data.contacts.map((c) => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
  }));

  return (
    <div>
      <PageHeader
        title="قراردادها"
        description={`${rows.length} قرارداد`}
      />
      <ContractsClient contracts={rows} contacts={contactOptions} />
    </div>
  );
}

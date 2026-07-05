import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Idempotent demo seed. Attaches CRM demo data to the first existing tenant
 * (created via registration). Safe to re-run — clears and reinserts demo rows.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEAL_STAGES = [
  { key: "new", name: "New", tone: "neutral", probability: 10 },
  { key: "qualified", name: "Qualified", tone: "info", probability: 25 },
  { key: "proposal", name: "Proposal", tone: "warning", probability: 50 },
  { key: "negotiation", name: "Negotiation", tone: "accent", probability: 75 },
  { key: "won", name: "Won", tone: "positive", probability: 100, isWon: true },
  { key: "lost", name: "Lost", tone: "danger", probability: 0, isLost: true },
];

async function main() {
  const tenant = await db.tenant.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { memberships: { take: 1 } },
  });
  if (!tenant) {
    console.log("No tenant found. Register a workspace first, then re-seed.");
    return;
  }
  const ownerId = tenant.memberships[0]?.id ?? null;
  const t = tenant.id;
  console.log(`Seeding demo data into tenant "${tenant.name}" (${t})`);

  // Companies
  const companies = await Promise.all(
    [
      { name: "Vienna Logistics GmbH", industry: "Logistics", size: "51-200" },
      { name: "Alpine Retail AG", industry: "Retail", size: "201-1000" },
      { name: "Danube Tech", industry: "Software", size: "11-50" },
    ].map((c) =>
      db.company.create({ data: { tenantId: t, ownerId, ...c } }),
    ),
  );

  // Contacts
  const contactSeed = [
    { firstName: "Lena", lastName: "Hofer", email: "lena@vienna-log.at", jobTitle: "COO", lifecycle: "customer", companyId: companies[0].id },
    { firstName: "Markus", lastName: "Bauer", email: "m.bauer@alpine.at", jobTitle: "Head of Ops", lifecycle: "prospect", companyId: companies[1].id },
    { firstName: "Sofia", lastName: "Reiter", email: "sofia@danube.tech", jobTitle: "CTO", lifecycle: "customer", companyId: companies[2].id },
    { firstName: "Jonas", lastName: "Winkler", email: "jonas.w@gmail.com", jobTitle: "Consultant", lifecycle: "lead" },
    { firstName: "Amelie", lastName: "Gruber", email: "amelie.gruber@web.at", jobTitle: "Owner", lifecycle: "lead" },
  ];
  const contacts = await Promise.all(
    contactSeed.map((c) =>
      db.contact.create({ data: { tenantId: t, ownerId, ...c } }),
    ),
  );

  // Pipeline + stages
  let pipeline = await db.pipeline.findFirst({
    where: { tenantId: t, entityType: "deal", isDefault: true },
    include: { stages: true },
  });
  if (!pipeline) {
    pipeline = await db.pipeline.create({
      data: {
        tenantId: t,
        entityType: "deal",
        key: "default",
        name: "Default",
        isDefault: true,
        stages: {
          create: DEAL_STAGES.map((s, i) => ({
            tenantId: t,
            key: s.key,
            name: s.name,
            position: i,
            tone: s.tone,
            probability: s.probability,
            isWon: s.isWon ?? false,
            isLost: s.isLost ?? false,
          })),
        },
      },
      include: { stages: true },
    });
  }
  const stageByKey = Object.fromEntries(
    pipeline.stages.map((s) => [s.key, s.id]),
  );

  // Deals across stages
  const dealSeed = [
    { title: "Vienna Logistics — Fleet CRM rollout", value: 48000, stage: "negotiation", contactId: contacts[0].id, companyId: companies[0].id },
    { title: "Alpine Retail — POS integration", value: 32000, stage: "proposal", contactId: contacts[1].id, companyId: companies[1].id },
    { title: "Danube Tech — Support retainer", value: 18000, stage: "qualified", contactId: contacts[2].id, companyId: companies[2].id },
    { title: "Winkler consulting package", value: 9500, stage: "new", contactId: contacts[3].id },
    { title: "Gruber onboarding", value: 4200, stage: "new", contactId: contacts[4].id },
    { title: "Alpine — annual renewal", value: 52000, stage: "won", contactId: contacts[1].id, companyId: companies[1].id },
  ];
  for (const d of dealSeed) {
    await db.deal.create({
      data: {
        tenantId: t,
        ownerId,
        title: d.title,
        value: d.value,
        currency: "EUR",
        pipelineId: pipeline.id,
        stageId: stageByKey[d.stage],
        contactId: d.contactId,
        companyId: d.companyId,
        status: d.stage === "won" ? "won" : d.stage === "lost" ? "lost" : "open",
      },
    });
  }

  console.log(
    `Seeded ${companies.length} companies, ${contacts.length} contacts, ${dealSeed.length} deals.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

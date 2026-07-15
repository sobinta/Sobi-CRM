import "dotenv/config";
import crypto from "node:crypto";
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

  // Knowledge base articles (AI content-suggestion source material)
  const articleSeed = [
    {
      title: "CRM rollout for logistics fleets",
      body: "A typical fleet CRM rollout takes 4-6 weeks: data migration from spreadsheets, dispatcher training, and a two-week parallel run alongside the old system before cutover. Most clients see dispatch response time drop by ~30%.",
      tags: ["logistics", "rollout", "fleet"],
    },
    {
      title: "POS integration checklist",
      body: "Before integrating a CRM with a retail POS system, confirm: SKU-level sync frequency, return/refund event mapping, and whether loyalty points should sync in real time or batch nightly. Most POS vendors expose a webhook we can consume directly.",
      tags: ["retail", "pos", "integration"],
    },
    {
      title: "Support retainer packages",
      body: "Our support retainers start at 10 hours/month and include priority ticket response (under 4 business hours), a monthly usage report, and one free configuration change per quarter. Retainers can be paused for up to 2 months per year.",
      tags: ["support", "retainer", "software"],
    },
  ];
  const articles = await Promise.all(
    articleSeed.map((a) => db.knowledgeArticle.create({ data: { tenantId: t, ...a } })),
  );

  // Leads: two open (website + chatbot sourced), one already converted.
  const leadSeed = [
    {
      title: "Fleet CRM enquiry",
      companyName: "Nordic Freight Partners",
      email: "ops@nordicfreight.example",
      phone: "+43 660 1234567",
      source: "website",
      customFields: { message: "We run 40 trucks and need better dispatch visibility. Looking for something that integrates with our existing telematics." },
    },
    {
      title: "POS integration question",
      companyName: "Meadow Market Retail",
      email: null,
      phone: null,
      source: "chatbot",
      customFields: { message: "Do you support real-time loyalty point sync with Lightspeed POS?" },
    },
  ];
  const [, openLead2] = await Promise.all(
    leadSeed.map((l) =>
      db.lead.create({
        data: {
          tenantId: t,
          title: l.title,
          companyName: l.companyName,
          email: l.email,
          phone: l.phone,
          source: l.source,
          customFields: l.customFields,
        },
      }),
    ),
  );

  // A chatbot conversation feeding the second lead, plus a converted lead
  // with its own conversation + contact/deal, to exercise the AI summary and
  // contract/campaign flows end-to-end from seed data.
  await db.conversation.create({
    data: {
      tenantId: t,
      externalId: `conv_${openLead2.id.slice(0, 8)}`,
      leadId: openLead2.id,
      channel: "website",
      messages: [
        { role: "user", content: "Hi, does your CRM sync loyalty points with Lightspeed POS in real time?" },
        { role: "assistant", content: "Yes — our POS integration supports real-time webhook-based sync for loyalty points, or nightly batch if you prefer." },
        { role: "user", content: "Great, can someone reach out with pricing?" },
      ],
    },
  });

  const convertedLeadCompany = await db.company.create({
    data: { tenantId: t, ownerId, name: "Riverside Consulting", industry: "Professional services", size: "11-50" },
  });
  const convertedLeadContact = await db.contact.create({
    data: {
      tenantId: t,
      ownerId,
      firstName: "Priya",
      lastName: "Nair",
      email: "priya.nair@riverside-consulting.example",
      jobTitle: "Managing Partner",
      lifecycle: "customer",
      companyId: convertedLeadCompany.id,
    },
  });
  const convertedLead = await db.lead.create({
    data: {
      tenantId: t,
      title: "Support retainer enquiry",
      companyName: convertedLeadCompany.name,
      email: convertedLeadContact.email,
      source: "chatbot",
      status: "converted",
      score: 82,
      scoreRationale: "Complete contact info, named company, and a clearly described support need from a high-engagement chatbot conversation.",
      scoredAt: new Date(),
      contactId: convertedLeadContact.id,
      convertedAt: new Date(),
      customFields: { message: "We need ongoing support for our client portal — roughly 10-15 tickets a month." },
    },
  });
  await db.conversation.create({
    data: {
      tenantId: t,
      externalId: `conv_${convertedLead.id.slice(0, 8)}`,
      leadId: convertedLead.id,
      contactId: convertedLeadContact.id,
      channel: "website",
      messages: [
        { role: "user", content: "We need ongoing support for our client portal, about 10-15 tickets a month." },
        { role: "assistant", content: "Our support retainers start at 10 hours/month with priority response under 4 business hours — want a quote?" },
        { role: "user", content: "Yes please, and can we start next month?" },
      ],
    },
  });

  // A contract for the converted lead's deal.
  const retainerDeal = await db.deal.create({
    data: {
      tenantId: t,
      ownerId,
      title: "Riverside Consulting — support retainer",
      value: 14400,
      currency: "EUR",
      pipelineId: pipeline.id,
      stageId: stageByKey.proposal,
      contactId: convertedLeadContact.id,
      companyId: convertedLeadCompany.id,
      status: "open",
    },
  });
  await db.contract.create({
    data: {
      tenantId: t,
      contractNo: "CTR-2026-0001",
      title: "Riverside Consulting — support retainer agreement",
      dealId: retainerDeal.id,
      contactId: convertedLeadContact.id,
      companyId: convertedLeadCompany.id,
      bodyMd: `# Support Retainer Agreement\n\n**Client:** ${convertedLeadCompany.name}\n**Package:** 10 hours/month support retainer\n**Annual value:** EUR 14,400\n\nThis agreement covers priority ticket response and monthly usage reporting as described in our support retainer packages.`,
      amount: 14400,
      currency: "EUR",
      durationLabel: "12 months",
      status: "sent",
      shareToken: crypto.randomBytes(24).toString("base64url"),
      sentAt: new Date(),
    },
  });

  // A campaign targeting won customers, with one recipient pre-drafted.
  const campaign = await db.campaign.create({
    data: {
      tenantId: t,
      name: "Won customers — quarterly check-in",
      goal: "Re-engage recent won customers with a short check-in and offer a free process review call.",
      segmentKey: "wonCustomers",
      status: "draft",
    },
  });
  await db.campaignEmail.create({
    data: {
      tenantId: t,
      campaignId: campaign.id,
      toName: `${contacts[1].firstName} ${contacts[1].lastName}`,
      toEmail: contacts[1].email!,
      context: { company: companies[1].name, dealTitle: "Alpine — annual renewal" },
      status: "pending",
    },
  });

  console.log(
    `Seeded ${companies.length + 1} companies, ${contacts.length + 1} contacts, ${dealSeed.length + 1} deals, ` +
      `${leadSeed.length + 1} leads, ${articles.length} knowledge articles, 1 contract, 1 campaign.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });

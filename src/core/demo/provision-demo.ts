import { auth } from "@/core/auth/auth";
import { systemDb } from "@/core/db/system";
import { DEMO_ROLE_KEY, DEMO_TENANT_SLUG } from "./constants";
import { getRuntimePublicDemoConfig } from "./runtime-config";
import {
  DEMO_MODULE_KEYS,
  DEMO_READ_PERMISSIONS,
  DEMO_STAGE_FIXTURES,
} from "./fixtures";

const PIPELINE_ID = "demo-pipeline-sales";

export interface DemoProvisionResult {
  userId: string;
  tenantId: string;
  membershipId: string;
}

export async function provisionPublicDemo(): Promise<DemoProvisionResult> {
  const config = getRuntimePublicDemoConfig();
  if (!config.enabled || !config.password) {
    throw new Error("Public demo mode is disabled.");
  }

  const authContext = await auth.$context;
  const passwordHash = await authContext.password.hash(config.password);
  const now = new Date();
  const periodEnd = new Date("2036-01-01T00:00:00.000Z");

  return systemDb.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email: config.email },
      update: {
        name: "Sobi Demo Visitor",
        emailVerified: true,
        locale: "en",
        isSuperAdmin: false,
        deletedAt: null,
      },
      create: {
        email: config.email,
        name: "Sobi Demo Visitor",
        emailVerified: true,
        locale: "en",
        isSuperAdmin: false,
      },
    });

    await tx.account.upsert({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: user.id,
        },
      },
      update: { userId: user.id, password: passwordHash },
      create: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    });

    await tx.pricingPlan.upsert({
      where: { key: "demo" },
      update: { active: true },
      create: {
        key: "demo",
        order: 99,
        active: true,
        translations: {},
        entitlements: ["crm.core"],
        limits: {},
      },
    });

    const tenant = await tx.tenant.upsert({
      where: { slug: DEMO_TENANT_SLUG },
      update: {
        name: "Sobi CRM Demo",
        status: "ACTIVE",
        settings: { locale: "en", publicDemo: true },
        deletedAt: null,
      },
      create: {
        name: "Sobi CRM Demo",
        slug: DEMO_TENANT_SLUG,
        status: "ACTIVE",
        settings: { locale: "en", publicDemo: true },
      },
    });

    await tx.tenantSubscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        planKey: "demo",
        provider: "manual",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
      },
      create: {
        tenantId: tenant.id,
        planKey: "demo",
        provider: "manual",
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    const role = await tx.role.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: DEMO_ROLE_KEY } },
      update: {
        name: "Demo viewer",
        description: "Public read-only product demonstration",
        isSystem: true,
        isAdmin: false,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        key: DEMO_ROLE_KEY,
        name: "Demo viewer",
        description: "Public read-only product demonstration",
        isSystem: true,
        isAdmin: false,
      },
    });
    await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
    await tx.rolePermission.createMany({
      data: DEMO_READ_PERMISSIONS.map((permission) => ({
        roleId: role.id,
        permission,
      })),
    });

    const membership = await tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { status: "ACTIVE", kind: "INTERNAL", deletedAt: null },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        status: "ACTIVE",
        kind: "INTERNAL",
      },
    });
    await tx.membershipRole.deleteMany({
      where: { membershipId: membership.id },
    });
    await tx.membershipRole.create({
      data: { membershipId: membership.id, roleId: role.id },
    });

    for (const moduleKey of DEMO_MODULE_KEYS) {
      await tx.featureGrant.upsert({
        where: {
          tenantId_key_scope_scopeId: {
            tenantId: tenant.id,
            key: `module.${moduleKey}`,
            scope: "TENANT",
            scopeId: "",
          },
        },
        update: { enabled: true, config: {} },
        create: {
          tenantId: tenant.id,
          key: `module.${moduleKey}`,
          scope: "TENANT",
          scopeId: "",
          enabled: true,
          config: {},
        },
      });
    }

    await tx.company.upsert({
      where: { id: "demo-company-alpine" },
      update: { tenantId: tenant.id, name: "Alpine Retail AG", industry: "Retail", size: "201-1000", ownerId: membership.id, deletedAt: null },
      create: { id: "demo-company-alpine", tenantId: tenant.id, name: "Alpine Retail AG", industry: "Retail", size: "201-1000", ownerId: membership.id },
    });
    await tx.company.upsert({
      where: { id: "demo-company-danube" },
      update: { tenantId: tenant.id, name: "Danube Tech", industry: "Software", size: "11-50", ownerId: membership.id, deletedAt: null },
      create: { id: "demo-company-danube", tenantId: tenant.id, name: "Danube Tech", industry: "Software", size: "11-50", ownerId: membership.id },
    });

    const contacts = [
      { id: "demo-contact-lena", firstName: "Lena", lastName: "Hofer", email: "lena@demo.example", jobTitle: "COO", companyId: "demo-company-alpine", lifecycle: "customer" },
      { id: "demo-contact-sofia", firstName: "Sofia", lastName: "Reiter", email: "sofia@demo.example", jobTitle: "CTO", companyId: "demo-company-danube", lifecycle: "prospect" },
      { id: "demo-contact-jonas", firstName: "Jonas", lastName: "Winkler", email: "jonas@demo.example", jobTitle: "Consultant", companyId: null, lifecycle: "lead" },
    ] as const;
    for (const contact of contacts) {
      await tx.contact.upsert({
        where: { id: contact.id },
        update: { tenantId: tenant.id, ownerId: membership.id, ...contact, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, ...contact },
      });
    }

    await tx.pipeline.upsert({
      where: { id: PIPELINE_ID },
      update: { tenantId: tenant.id, entityType: "deal", key: "default", name: "Sales pipeline", isDefault: true },
      create: { id: PIPELINE_ID, tenantId: tenant.id, entityType: "deal", key: "default", name: "Sales pipeline", isDefault: true },
    });
    for (const stage of DEMO_STAGE_FIXTURES) {
      await tx.stage.upsert({
        where: { id: stage.id },
        update: { tenantId: tenant.id, pipelineId: PIPELINE_ID, ...stage },
        create: { tenantId: tenant.id, pipelineId: PIPELINE_ID, ...stage },
      });
    }

    const deals = [
      { id: "demo-deal-fleet", title: "Fleet CRM rollout", value: 48000, stageId: "demo-stage-negotiation", contactId: "demo-contact-lena", companyId: "demo-company-alpine" },
      { id: "demo-deal-pos", title: "POS integration", value: 32000, stageId: "demo-stage-proposal", contactId: "demo-contact-lena", companyId: "demo-company-alpine" },
      { id: "demo-deal-support", title: "Support retainer", value: 18000, stageId: "demo-stage-qualified", contactId: "demo-contact-sofia", companyId: "demo-company-danube" },
      { id: "demo-deal-consulting", title: "Consulting package", value: 9500, stageId: "demo-stage-new", contactId: "demo-contact-jonas", companyId: null },
    ] as const;
    for (const deal of deals) {
      await tx.deal.upsert({
        where: { id: deal.id },
        update: { tenantId: tenant.id, pipelineId: PIPELINE_ID, ownerId: membership.id, currency: "EUR", status: "open", ...deal, deletedAt: null },
        create: { tenantId: tenant.id, pipelineId: PIPELINE_ID, ownerId: membership.id, currency: "EUR", status: "open", ...deal },
      });
    }

    const leads = [
      { id: "demo-lead-fleet", title: "Fleet CRM enquiry", companyName: "Nordic Freight Partners", email: "fleet@demo.example", source: "website", status: "new", score: 74 },
      { id: "demo-lead-market", title: "POS integration question", companyName: "Meadow Market", email: "market@demo.example", source: "chatbot", status: "qualified", score: 61 },
      { id: "demo-lead-support", title: "Support retainer enquiry", companyName: "Riverside Consulting", email: "support@demo.example", source: "chatbot", status: "converted", score: 82 },
    ] as const;
    for (const lead of leads) {
      await tx.lead.upsert({
        where: { id: lead.id },
        update: { tenantId: tenant.id, ownerId: membership.id, ...lead, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, ...lead },
      });
    }

    const tasks = [
      { id: "demo-task-follow-up", title: "Follow up with Alpine Retail", status: "todo", priority: "high", dueAt: new Date(Date.now() + 86_400_000) },
      { id: "demo-task-proposal", title: "Review support proposal", status: "in_progress", priority: "normal", dueAt: new Date(Date.now() + 3 * 86_400_000) },
    ] as const;
    for (const task of tasks) {
      await tx.task.upsert({
        where: { id: task.id },
        update: { tenantId: tenant.id, assigneeId: membership.id, ownerId: membership.id, ...task, deletedAt: null },
        create: { tenantId: tenant.id, assigneeId: membership.id, ownerId: membership.id, ...task },
      });
    }

    await tx.knowledgeArticle.upsert({
      where: { id: "demo-article-rollout" },
      update: { tenantId: tenant.id, title: "CRM rollout playbook", body: "A practical guide for moving a sales team from spreadsheets into a shared CRM workspace.", tags: ["rollout", "sales"], deletedAt: null },
      create: { id: "demo-article-rollout", tenantId: tenant.id, title: "CRM rollout playbook", body: "A practical guide for moving a sales team from spreadsheets into a shared CRM workspace.", tags: ["rollout", "sales"] },
    });

    await tx.event.upsert({
      where: { tenantId_id: { tenantId: tenant.id, id: "demo-event-lead" } },
      update: { type: "lead.created", entityType: "lead", entityId: "demo-lead-fleet", actorId: membership.id, payload: {}, dispatchedAt: now },
      create: { id: "demo-event-lead", tenantId: tenant.id, type: "lead.created", entityType: "lead", entityId: "demo-lead-fleet", actorId: membership.id, payload: {}, dispatchedAt: now },
    });
    await tx.event.upsert({
      where: { tenantId_id: { tenantId: tenant.id, id: "demo-event-deal" } },
      update: { type: "deal.stage_changed", entityType: "deal", entityId: "demo-deal-fleet", actorId: membership.id, payload: {}, dispatchedAt: now },
      create: { id: "demo-event-deal", tenantId: tenant.id, type: "deal.stage_changed", entityType: "deal", entityId: "demo-deal-fleet", actorId: membership.id, payload: {}, dispatchedAt: now },
    });

    // --- Business module demo data (loans, real estate, immigration, booking) ---
    const at = (offsetDays: number, hour = 10) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, hour, 0, 0);

    // Loan & Banking
    await tx.bankPartner.upsert({
      where: { id: "demo-bank-alpenbank" },
      update: { tenantId: tenant.id, name: "Alpenbank", deletedAt: null },
      create: { id: "demo-bank-alpenbank", tenantId: tenant.id, name: "Alpenbank" },
    });
    const loans = [
      { id: "demo-loan-1", reference: "LN-0001", applicantName: "Lena Hofer", purpose: "home", amount: 320000, termMonths: 240, status: "approved", contactId: "demo-contact-lena", bankPartnerId: "demo-bank-alpenbank" },
      { id: "demo-loan-2", reference: "LN-0002", applicantName: "Sofia Reiter", purpose: "business", amount: 85000, termMonths: 60, status: "under_review", contactId: "demo-contact-sofia", bankPartnerId: "demo-bank-alpenbank" },
      { id: "demo-loan-3", reference: "LN-0003", applicantName: "Jonas Winkler", purpose: "auto", amount: 24000, termMonths: 48, status: "submitted", contactId: "demo-contact-jonas", bankPartnerId: null },
    ] as const;
    for (const loan of loans) {
      await tx.loanApplication.upsert({
        where: { id: loan.id },
        update: { tenantId: tenant.id, ownerId: membership.id, currency: "EUR", submittedAt: now, ...loan, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, currency: "EUR", submittedAt: now, ...loan },
      });
    }

    // Real Estate
    const properties = [
      { id: "demo-prop-1", title: "Ringstrasse 2-bed apartment", address: "Ringstrasse 12, Vienna", propertyType: "apartment", price: 480000, bedrooms: 2, status: "available" },
      { id: "demo-prop-2", title: "Grinzing family house", address: "Grinzinger Allee 5, Vienna", propertyType: "house", price: 1250000, bedrooms: 5, status: "reserved" },
      { id: "demo-prop-3", title: "Downtown retail unit", address: "Kärntner Str. 30, Vienna", propertyType: "commercial", price: 890000, bedrooms: null, status: "available" },
    ] as const;
    for (const prop of properties) {
      await tx.property.upsert({
        where: { id: prop.id },
        update: { tenantId: tenant.id, ownerId: membership.id, currency: "EUR", ...prop, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, currency: "EUR", ...prop },
      });
    }
    const viewings = [
      { id: "demo-view-1", propertyId: "demo-prop-1", visitorName: "Lena Hofer", contactId: "demo-contact-lena", scheduledAt: at(3, 14), status: "scheduled" },
      { id: "demo-view-2", propertyId: "demo-prop-3", visitorName: "Sofia Reiter", contactId: "demo-contact-sofia", scheduledAt: at(6, 11), status: "scheduled" },
    ] as const;
    for (const viewing of viewings) {
      await tx.viewing.upsert({
        where: { id: viewing.id },
        update: { tenantId: tenant.id, ownerId: membership.id, ...viewing, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, ...viewing },
      });
    }

    // Immigration
    const cases = [
      { id: "demo-imm-1", reference: "IMM-0001", clientName: "Amir Karimi", visaType: "work", authority: "BMI Austria", status: "submitted", deadline: at(10), contactId: null },
      { id: "demo-imm-2", reference: "IMM-0002", clientName: "Maria Santos", visaType: "student", authority: "OeAD", status: "preparing", deadline: at(5), contactId: null },
      { id: "demo-imm-3", reference: "IMM-0003", clientName: "Wei Chen", visaType: "family", authority: "BMI Austria", status: "approved", deadline: null, contactId: null },
    ] as const;
    for (const c of cases) {
      await tx.immigrationCase.upsert({
        where: { id: c.id },
        update: { tenantId: tenant.id, ownerId: membership.id, submittedAt: now, ...c, deletedAt: null },
        create: { tenantId: tenant.id, ownerId: membership.id, submittedAt: now, ...c },
      });
    }

    // Booking modules (barber, salon, restaurant) — shared Booking-engine tables
    const bookingServices = [
      { id: "demo-svc-barber-cut", moduleKey: "barber", name: "Classic cut", durationMin: 30, price: 28 },
      { id: "demo-svc-barber-beard", moduleKey: "barber", name: "Beard trim", durationMin: 20, price: 18 },
      { id: "demo-svc-salon-color", moduleKey: "salon", name: "Full colour", durationMin: 90, price: 95 },
      { id: "demo-svc-salon-mani", moduleKey: "salon", name: "Manicure", durationMin: 45, price: 35 },
    ] as const;
    for (const svc of bookingServices) {
      await tx.service.upsert({
        where: { id: svc.id },
        update: { tenantId: tenant.id, currency: "EUR", active: true, ...svc, deletedAt: null },
        create: { tenantId: tenant.id, currency: "EUR", active: true, ...svc },
      });
    }
    const bookingStaff = [
      { id: "demo-staff-barber", moduleKey: "barber", name: "Marco", role: "Barber" },
      { id: "demo-staff-salon", moduleKey: "salon", name: "Elif", role: "Stylist" },
    ] as const;
    for (const staff of bookingStaff) {
      await tx.staffMember.upsert({
        where: { id: staff.id },
        update: { tenantId: tenant.id, active: true, ...staff, deletedAt: null },
        create: { tenantId: tenant.id, active: true, ...staff },
      });
    }
    const appointments = [
      { id: "demo-appt-barber-1", moduleKey: "barber", serviceId: "demo-svc-barber-cut", staffId: "demo-staff-barber", customerName: "Tomas B.", start: at(1, 10), dur: 30, partySize: null },
      { id: "demo-appt-barber-2", moduleKey: "barber", serviceId: "demo-svc-barber-beard", staffId: "demo-staff-barber", customerName: "Felix K.", start: at(2, 15), dur: 20, partySize: null },
      { id: "demo-appt-salon-1", moduleKey: "salon", serviceId: "demo-svc-salon-color", staffId: "demo-staff-salon", customerName: "Nina W.", start: at(1, 13), dur: 90, partySize: null },
      { id: "demo-appt-rest-1", moduleKey: "restaurant", serviceId: null, staffId: null, customerName: "Weber party", start: at(1, 19), dur: 120, partySize: 4 },
      { id: "demo-appt-rest-2", moduleKey: "restaurant", serviceId: null, staffId: null, customerName: "Gruber party", start: at(2, 20), dur: 120, partySize: 2 },
    ] as const;
    for (const a of appointments) {
      const endAt = new Date(a.start.getTime() + a.dur * 60_000);
      await tx.appointment.upsert({
        where: { id: a.id },
        update: { tenantId: tenant.id, ownerId: membership.id, status: "booked", moduleKey: a.moduleKey, serviceId: a.serviceId, staffId: a.staffId, customerName: a.customerName, startAt: a.start, endAt, partySize: a.partySize, deletedAt: null },
        create: { id: a.id, tenantId: tenant.id, ownerId: membership.id, status: "booked", moduleKey: a.moduleKey, serviceId: a.serviceId, staffId: a.staffId, customerName: a.customerName, startAt: a.start, endAt, partySize: a.partySize },
      });
    }

    return {
      userId: user.id,
      tenantId: tenant.id,
      membershipId: membership.id,
    };
  });
}

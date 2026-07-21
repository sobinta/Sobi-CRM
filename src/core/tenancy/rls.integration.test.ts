import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/core/db";
import { identityDb } from "@/core/db/identity";
import { systemDb } from "@/core/db/system";
import { publicTenantContext, runWithContext } from "./context";
import { registerBuiltinEntity, resolveEntity } from "@/core/metadata/registry";
import { assignOperatorTicket } from "@/engines/platform-admin/support-service";

const enabled = process.env.RUN_DATABASE_INTEGRATION_TESTS === "true";
const suite = enabled ? describe : describe.skip;

suite("PostgreSQL tenant RLS", () => {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let tenantA = "";
  let tenantB = "";
  let companyA = "";
  let companyB = "";
  let userA = "";
  let userA2 = "";
  let userB = "";
  let membershipA = "";
  let membershipA2 = "";
  let membershipB = "";

  beforeAll(async () => {
    registerBuiltinEntity({ key: "contact", nameSingular: "Contact", namePlural: "Contacts", source: "builtin", module: "crm", titleField: "firstName", fields: [{ key: "firstName", label: "First name", type: "text" }] });
    const [a, b] = await Promise.all([
      systemDb.tenant.create({
        data: { name: `RLS A ${nonce}`, slug: `rls-a-${nonce}` },
      }),
      systemDb.tenant.create({
        data: { name: `RLS B ${nonce}`, slug: `rls-b-${nonce}` },
      }),
    ]);
    tenantA = a.id;
    tenantB = b.id;
    const [aCompany, bCompany] = await Promise.all([
      systemDb.company.create({ data: { tenantId: tenantA, name: `A ${nonce}` } }),
      systemDb.company.create({ data: { tenantId: tenantB, name: `B ${nonce}` } }),
    ]);
    companyA = aCompany.id;
    companyB = bCompany.id;
    const [aUser, aUser2, bUser] = await Promise.all([
      systemDb.user.create({ data: { email: `rls-a-${nonce}@example.test`, name: "RLS A" } }),
      systemDb.user.create({ data: { email: `rls-a2-${nonce}@example.test`, name: "RLS A2" } }),
      systemDb.user.create({ data: { email: `rls-b-${nonce}@example.test`, name: "RLS B" } }),
    ]);
    userA = aUser.id;
    userA2 = aUser2.id;
    userB = bUser.id;
    const [aMembership, aMembership2, bMembership] = await Promise.all([
      systemDb.membership.create({ data: { tenantId: tenantA, userId: userA } }),
      systemDb.membership.create({ data: { tenantId: tenantA, userId: userA2 } }),
      systemDb.membership.create({ data: { tenantId: tenantB, userId: userB } }),
    ]);
    membershipA = aMembership.id;
    membershipA2 = aMembership2.id;
    membershipB = bMembership.id;
  });

  afterAll(async () => {
    if (tenantA && tenantB) {
      await systemDb.supportMessage.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.supportTicket.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.calendarReminder.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.calendarEvent.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.entityDefinition.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.onboardingProgress.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.membership.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.contact.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.company.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
      await systemDb.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
      await systemDb.user.deleteMany({ where: { id: { in: [userA, userA2, userB] } } });
    }
    await Promise.all([
      db.$disconnect(),
      identityDb.$disconnect(),
      systemDb.$disconnect(),
    ]);
  });

  it("isolates ORM and raw reads on reused pooled connections", async () => {
    const countFor = (tenantId: string) =>
      runWithContext(publicTenantContext(tenantId), async () => {
        const orm = await db.company.findMany({ select: { id: true } });
        const raw = await db.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*)::bigint AS count FROM "Company"
        `;
        return { ids: orm.map(({ id }) => id), count: Number(raw[0]?.count ?? 0) };
      });

    await expect(countFor(tenantA)).resolves.toEqual({ ids: [companyA], count: 1 });
    await expect(countFor(tenantB)).resolves.toEqual({ ids: [companyB], count: 1 });
    await expect(countFor(tenantA)).resolves.toEqual({ ids: [companyA], count: 1 });
  });

  it("overwrites a forged tenantId on create", async () => {
    const created = await runWithContext(publicTenantContext(tenantA), () =>
      db.company.create({
        data: { tenantId: tenantB, name: `Forged ${nonce}` },
      }),
    );
    expect(created.tenantId).toBe(tenantA);
    await systemDb.company.delete({ where: { id: created.id } });
  });

  it("isolates aggregate, bulk create, update, delete, and upsert", async () => {
    await runWithContext(publicTenantContext(tenantA), async () => {
      const created = await db.company.createManyAndReturn({
        data: [
          { tenantId: tenantB, name: `Bulk 1 ${nonce}` },
          { tenantId: tenantB, name: `Bulk 2 ${nonce}` },
        ],
        select: { id: true, tenantId: true },
      });
      expect(created.every((row) => row.tenantId === tenantA)).toBe(true);

      const aggregate = await db.company.aggregate({ _count: { _all: true } });
      expect(aggregate._count._all).toBe(3);

      const update = await db.company.updateMany({
        where: { id: companyB, tenantId: tenantB },
        data: { name: "cross-tenant-update" },
      });
      expect(update.count).toBe(0);

      await expect(db.company.delete({ where: { id: companyB } })).rejects.toThrow();
      await expect(
        db.company.upsert({
          where: { id: companyB },
          create: { id: companyB, tenantId: tenantB, name: "forged-upsert" },
          update: { name: "cross-tenant-upsert" },
        }),
      ).rejects.toThrow();
    });

    const untouched = await systemDb.company.findUnique({ where: { id: companyB } });
    expect(untouched?.name).toBe(`B ${nonce}`);
  });

  it("rejects a cross-tenant foreign-key relation at the database layer", async () => {
    await expect(
      runWithContext(publicTenantContext(tenantA), () =>
        db.contact.create({
          data: {
            tenantId: tenantA,
            firstName: "Cross",
            lastName: "Tenant",
            companyId: companyB,
          },
        }),
      ),
    ).rejects.toThrow();

    await expect(
      runWithContext(publicTenantContext(tenantA), () =>
        db.contact.create({
          data: {
            tenantId: tenantA,
            firstName: "Nested",
            lastName: "Connect",
            company: { connect: { id: companyB } },
          } as never,
        }),
      ),
    ).rejects.toThrow();
  });

  it("does not grant the identity capability access to CRM tables", async () => {
    await expect(identityDb.company.findMany({ take: 1 })).rejects.toThrow();
  });

  it("isolates onboarding progress by both tenant and membership", async () => {
    const contextFor = (tenantId: string, membershipId: string, userId: string) => ({
      ...publicTenantContext(tenantId),
      membershipId,
      userId,
    });

    const created = await runWithContext(contextFor(tenantA, membershipA, userA), () =>
      db.onboardingProgress.create({
        data: {
          tenantId: tenantA,
          membershipId: membershipA,
          tourKey: "rls-tour",
          version: 1,
        },
      }),
    );

    await expect(
      runWithContext(contextFor(tenantA, membershipA, userA), () =>
        db.onboardingProgress.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([{ id: created.id }]);
    await expect(
      runWithContext(contextFor(tenantA, membershipA2, userA2), () =>
        db.onboardingProgress.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([]);
    await expect(
      runWithContext(contextFor(tenantB, membershipB, userB), () =>
        db.onboardingProgress.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([]);

    await expect(
      runWithContext(contextFor(tenantA, membershipA, userA), () =>
        db.onboardingProgress.create({
          data: {
            tenantId: tenantA,
            membershipId: membershipB,
            tourKey: "forged-membership",
            version: 1,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("isolates calendar reminders and rejects forged membership references", async () => {
    const contextFor = (tenantId: string, membershipId: string, userId: string) => ({
      ...publicTenantContext(tenantId),
      membershipId,
      userId,
    });

    const event = await runWithContext(contextFor(tenantA, membershipA, userA), () =>
      db.calendarEvent.create({
        data: {
          tenantId: tenantA,
          title: `RLS event ${nonce}`,
          startAt: new Date("2026-07-21T09:00:00.000Z"),
          endAt: new Date("2026-07-21T10:00:00.000Z"),
          ownerId: membershipA,
        },
      }),
    );

    const reminder = await runWithContext(contextFor(tenantA, membershipA, userA), () =>
      db.calendarReminder.create({
        data: {
          tenantId: tenantA,
          eventId: event.id,
          membershipId: membershipA,
          offsetMinutes: 15,
          triggerAt: new Date("2026-07-21T08:45:00.000Z"),
        },
      }),
    );

    await expect(
      runWithContext(contextFor(tenantA, membershipA, userA), () =>
        db.calendarReminder.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([{ id: reminder.id }]);
    await expect(
      runWithContext(contextFor(tenantA, membershipA2, userA2), () =>
        db.calendarReminder.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([]);
    await expect(
      runWithContext(contextFor(tenantB, membershipB, userB), () =>
        db.calendarReminder.findMany({ select: { id: true } }),
      ),
    ).resolves.toEqual([]);

    await expect(
      runWithContext(contextFor(tenantA, membershipA, userA), () =>
        db.calendarReminder.create({
          data: {
            tenantId: tenantA,
            eventId: event.id,
            membershipId: membershipB,
            offsetMinutes: 60,
            triggerAt: new Date("2026-07-21T08:00:00.000Z"),
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("isolates support conversations by requester and deduplicates client messages", async () => {
    const contextFor = (tenantId: string, membershipId: string, userId: string) => ({
      ...publicTenantContext(tenantId), membershipId, userId,
    });
    const ticket = await runWithContext(contextFor(tenantA, membershipA, userA), () =>
      db.supportTicket.create({
        data: {
          tenantId: tenantA,
          requesterMembershipId: membershipA,
          subject: `Support ${nonce}`,
          messages: { create: { senderMembershipId: membershipA, senderUserId: userA, senderKind: "CUSTOMER", body: "Safe test body", clientMessageId: `initial_${nonce.replace(/[^a-z0-9]/gi, "_")}` } },
        },
      }),
    );

    await expect(runWithContext(contextFor(tenantA, membershipA, userA), () => db.supportTicket.findMany({ select: { id: true } }))).resolves.toEqual([{ id: ticket.id }]);
    await expect(runWithContext(contextFor(tenantA, membershipA2, userA2), () => db.supportTicket.findMany({ select: { id: true } }))).resolves.toEqual([]);
    await expect(runWithContext(contextFor(tenantB, membershipB, userB), () => db.supportTicket.findMany({ select: { id: true } }))).resolves.toEqual([]);

    await expect(runWithContext(contextFor(tenantA, membershipA, userA), () => db.supportTicket.create({ data: { tenantId: tenantA, requesterMembershipId: membershipB, subject: "Forged requester" } }))).rejects.toThrow();

    const duplicateInput = { tenantId: tenantA, ticketId: ticket.id, senderMembershipId: membershipA, senderUserId: userA, senderKind: "CUSTOMER" as const, body: "Retry-safe", clientMessageId: `retry_${nonce.replace(/[^a-z0-9]/gi, "_")}` };
    await runWithContext(contextFor(tenantA, membershipA, userA), () => db.supportMessage.create({ data: duplicateInput }));
    await expect(runWithContext(contextFor(tenantA, membershipA, userA), () => db.supportMessage.create({ data: duplicateInput }))).rejects.toMatchObject({ code: "P2002" });

    await systemDb.supportMessage.create({ data: { tenantId: tenantA, ticketId: ticket.id, senderUserId: userB, senderKind: "OPERATOR", body: "Operator response" } });
    const visible = await runWithContext(contextFor(tenantA, membershipA, userA), () => db.supportMessage.findMany({ where: { ticketId: ticket.id }, select: { senderKind: true } }));
    expect(visible.map((message) => message.senderKind)).toContain("OPERATOR");

    await expect(runWithContext(contextFor(tenantA, membershipA, userA), () => assignOperatorTicket(ticket.id, userA))).rejects.toThrow("platform.super-admin");
    await runWithContext({ ...contextFor(tenantA, membershipA, userA), isSuperAdmin: true }, () => assignOperatorTicket(ticket.id, userA));
    const audit = await systemDb.auditLog.findFirst({ where: { tenantId: tenantA, action: "support.ticket.assign", entityId: ticket.id } });
    expect(audit?.after).toMatchObject({ targetTenantId: tenantA, assigned: true });
  });

  it("merges only the active tenant's built-in field extensions", async () => {
    await systemDb.entityDefinition.createMany({ data: [
      { tenantId: tenantA, key: "contact", nameSingular: "Contact", namePlural: "Contacts", source: "extension", fields: [{ key: "tenant_a_field", label: "Tenant A", type: "text" }] },
      { tenantId: tenantB, key: "contact", nameSingular: "Contact", namePlural: "Contacts", source: "extension", fields: [{ key: "tenant_b_field", label: "Tenant B", type: "text" }] },
    ] });
    const contextFor = (tenantId: string, membershipId: string, userId: string) => ({ ...publicTenantContext(tenantId), membershipId, userId });
    const metaA = await runWithContext(contextFor(tenantA, membershipA, userA), () => resolveEntity("contact"));
    const metaB = await runWithContext(contextFor(tenantB, membershipB, userB), () => resolveEntity("contact"));
    expect(metaA?.fields.some((field) => field.key === "tenant_a_field")).toBe(true);
    expect(metaA?.fields.some((field) => field.key === "tenant_b_field")).toBe(false);
    expect(metaB?.fields.some((field) => field.key === "tenant_b_field")).toBe(true);
    expect(metaB?.fields.some((field) => field.key === "tenant_a_field")).toBe(false);
  });
});

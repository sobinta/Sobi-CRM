import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/core/db";
import { identityDb } from "@/core/db/identity";
import { systemDb } from "@/core/db/system";
import { publicTenantContext, runWithContext } from "./context";

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
          },
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
});

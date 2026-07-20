import type { PrismaClient } from "@/generated/prisma/client";
import { makePrismaClient } from "./factory";

const globalForIdentity = globalThis as unknown as {
  __sobiIdentityDb?: PrismaClient;
};

/** Global identity capability: auth, sessions, users, and memberships only. */
export const identityDb: PrismaClient =
  globalForIdentity.__sobiIdentityDb ??
  makePrismaClient(
    process.env.IDENTITY_DATABASE_URL ?? process.env.DATABASE_URL,
  );

if (process.env.NODE_ENV !== "production") {
  globalForIdentity.__sobiIdentityDb = identityDb;
}

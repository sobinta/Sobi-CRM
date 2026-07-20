import type { PrismaClient } from "@/generated/prisma/client";
import { makePrismaClient } from "./factory";

const globalForSystem = globalThis as unknown as {
  __sobiSystemDb?: PrismaClient;
};

/** Cross-tenant capability: provisioning and dispatch/gateway code only. */
export const systemDb: PrismaClient =
  globalForSystem.__sobiSystemDb ??
  makePrismaClient(
    process.env.SYSTEM_DATABASE_URL ??
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL,
  );

if (process.env.NODE_ENV !== "production") {
  globalForSystem.__sobiSystemDb = systemDb;
}

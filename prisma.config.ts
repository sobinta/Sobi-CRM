import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Multi-file schema: every .prisma file in this folder is part of one schema.
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma migrate` needs a *non-pooled* connection (DIRECT_URL). The
    // running app is unaffected by this — it connects via its own PrismaPg
    // driver adapter reading DATABASE_URL directly (src/core/db.ts), which
    // can safely be a connection pooler (e.g. Supabase's pgbouncer) on
    // serverless platforms. Falls back to DATABASE_URL when DIRECT_URL isn't
    // set (e.g. local dev against a single non-pooled Postgres).
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});

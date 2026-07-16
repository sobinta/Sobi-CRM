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
    url: process.env["DIRECT_URL"],
  },
});

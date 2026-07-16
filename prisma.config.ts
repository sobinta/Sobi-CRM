import "dotenv/config";
import { defineConfig } from "prisma/config";

// آدرس‌های دیتابیس را از متغیرهای محیطی می‌خوانیم
const databaseUrl = process.env["DATABASE_URL"];
const directUrl = process.env["DIRECT_URL"];

export default defineConfig({
  // Multi-file schema: تمام فایل‌های .prisma در این پوشه بخشی از یک اسکیما هستند
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
    // اضافه کردن قابلیت Direct Connection برای زمان اجرای مایگریشن‌ها
    ...(directUrl ? { directUrl } : {}),
  },
});

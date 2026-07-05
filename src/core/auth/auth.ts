import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { rawDb } from "@/core/db";

/**
 * Better Auth instance.
 *
 * Uses the unscoped client: the auth tables (User/Session/Account/
 * Verification) are global identity, not tenant-scoped, so they must bypass
 * the tenant extension. Tenant membership + RBAC layer on top of the
 * authenticated user in @/core/auth/session.
 *
 * Default model names (user/session/account/verification) map to Prisma's
 * camelCase delegates, which is why no modelName overrides are needed.
 */
const isDev = process.env.NODE_ENV !== "production";

export const auth = betterAuth({
  database: prismaAdapter(rawDb, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  // In production, pin the base URL. In dev, let Better Auth infer the origin
  // so it works on whatever port the dev server (autoPort) lands on.
  ...(isDev ? {} : { baseURL: process.env.BETTER_AUTH_URL }),
  // Trust any localhost origin in dev (dynamic ports); pin in production.
  trustedOrigins: isDev
    ? ["http://localhost:*", "http://127.0.0.1:*"]
    : [process.env.BETTER_AUTH_URL ?? ""],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    additionalFields: {
      locale: { type: "string", required: false, defaultValue: "en" },
      isSuperAdmin: { type: "boolean", required: false, defaultValue: false },
    },
  },
  advanced: {
    database: { generateId: false },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;

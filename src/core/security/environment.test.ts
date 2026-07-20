import { describe, expect, it } from "vitest";
import { productionEnvironmentProblems } from "./environment";

const secure = {
  DATABASE_URL: "postgresql://tenant:secret@db.example.test/app",
  IDENTITY_DATABASE_URL: "postgresql://identity:secret@db.example.test/app",
  SYSTEM_DATABASE_URL: "postgresql://system:secret@db.example.test/app",
  DIRECT_URL: "postgresql://migration:secret@db.example.test/app",
  BETTER_AUTH_SECRET: "a".repeat(40),
  FILE_SIGNING_SECRET: "b".repeat(40),
  JOB_RUNNER_SECRET: "c".repeat(40),
  FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  BETTER_AUTH_URL: "https://crm.example.test",
  NEXT_PUBLIC_APP_URL: "https://crm.example.test",
  WEBHOOK_ALLOW_PRIVATE_NETWORKS: "false",
  RATE_LIMIT_BACKEND: "redis",
  RATE_LIMIT_REDIS_URL: "rediss://cache.example.test:6379",
  FILE_STORAGE_DRIVER: "s3",
  FILE_STORAGE_S3_BUCKET: "crm-files",
  FILE_STORAGE_S3_REGION: "eu-central-1",
};

describe("production environment policy", () => {
  it("accepts separated capabilities and strong secrets", () => {
    expect(productionEnvironmentProblems(secure)).toEqual([]);
  });

  it("rejects shared roles, placeholders, bad encryption, and insecure URLs", () => {
    const problems = productionEnvironmentProblems({
      ...secure,
      IDENTITY_DATABASE_URL: secure.DATABASE_URL,
      BETTER_AUTH_SECRET: "change-me",
      FIELD_ENCRYPTION_KEY: "not-a-key",
      BETTER_AUTH_URL: "http://crm.example.test",
      WEBHOOK_ALLOW_PRIVATE_NETWORKS: "true",
      RATE_LIMIT_BACKEND: "memory",
      RATE_LIMIT_REDIS_URL: "http://cache.example.test",
      FILE_STORAGE_DRIVER: "local",
    });
    expect(problems).toContain("database capabilities must use four distinct URLs/roles");
    expect(problems).toContain(
      "BETTER_AUTH_SECRET must be a non-placeholder 32+ character secret",
    );
    expect(problems).toContain(
      "FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
    expect(problems).toContain("BETTER_AUTH_URL must use HTTPS");
    expect(problems).toContain(
      "WEBHOOK_ALLOW_PRIVATE_NETWORKS cannot be enabled in production",
    );
    expect(problems).toContain("RATE_LIMIT_BACKEND must be redis in production");
    expect(problems).toContain("RATE_LIMIT_REDIS_URL must be a Redis URL");
    expect(problems).toContain("FILE_STORAGE_DRIVER must be s3 in production");
  });
});

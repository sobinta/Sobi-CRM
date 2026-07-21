import { afterEach, describe, expect, it } from "vitest";
import { MemoryRateLimitStore, setRateLimitStoreForTests } from "@/core/security/rate-limit";
import { publicTenantContext, runWithContext } from "@/core/tenancy/context";
import { enforceSupportRateLimit, SupportRateLimitError } from "./support-service";

afterEach(() => setRateLimitStoreForTests(undefined));

describe("support abuse policy", () => {
  it("limits a tenant user at the service boundary", async () => {
    setRateLimitStoreForTests(new MemoryRateLimitStore(() => 1_000));
    const context = { ...publicTenantContext("tenant-support"), userId: "user-support", membershipId: "member-support" };
    await runWithContext(context, () => enforceSupportRateLimit("test", 1, 60_000));
    await expect(runWithContext(context, () => enforceSupportRateLimit("test", 1, 60_000))).rejects.toBeInstanceOf(SupportRateLimitError);
  });
});

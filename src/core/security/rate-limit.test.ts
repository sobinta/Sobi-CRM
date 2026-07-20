import { afterEach, describe, expect, it } from "vitest";
import {
  limit,
  MemoryRateLimitStore,
  rateLimitKey,
  RedisRateLimitStore,
  setRateLimitStoreForTests,
  type RateLimitStore,
} from "./rate-limit";

afterEach(() => setRateLimitStoreForTests());

describe("rate limiting", () => {
  it("uses opaque keys", () => {
    const key = rateLimitKey("login", "person@example.com");
    expect(key).toMatch(/^login:[a-f0-9]{64}$/);
    expect(key).not.toContain("person@example.com");
  });

  it("enforces and resets a fixed memory window", async () => {
    let now = 1_000;
    const store = new MemoryRateLimitStore(() => now);
    expect((await store.consume("k", { max: 2, windowMs: 100 })).ok).toBe(true);
    expect((await store.consume("k", { max: 2, windowMs: 100 })).ok).toBe(true);
    expect((await store.consume("k", { max: 2, windowMs: 100 })).ok).toBe(false);
    now = 1_100;
    expect((await store.consume("k", { max: 2, windowMs: 100 })).ok).toBe(true);
  });

  it("fails closed when the selected store is unavailable", async () => {
    const unavailable: RateLimitStore = {
      consume: async () => {
        throw new Error("offline");
      },
    };
    setRateLimitStoreForTests(unavailable);
    await expect(limit("k", { max: 1, windowMs: 100 })).resolves.toMatchObject({
      ok: false,
      unavailable: true,
    });
  });

  it("interprets the atomic Redis counter and TTL", async () => {
    const evalCommand = async () => [3, 9_000];
    const store = new RedisRateLimitStore({ eval: evalCommand } as never);
    await expect(
      store.consume("opaque", { max: 3, windowMs: 10_000 }),
    ).resolves.toEqual({ ok: true, remaining: 0, resetMs: 9_000 });
  });
});

import crypto from "node:crypto";
import { createClient, type RedisClientType } from "redis";

/** Stable opaque key so raw tokens, IPs, emails, or tenant slugs aren't stored. */
export function rateLimitKey(namespace: string, identifier: string): string {
  const digest = crypto.createHash("sha256").update(identifier).digest("hex");
  return `${namespace}:${digest}`;
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
  /** Selected distributed backend could not make a decision. */
  unavailable?: boolean;
}

export interface RateLimitStore {
  consume(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

interface MemoryWindow {
  count: number;
  expiresAt: number;
}

/** Development/test implementation. Production validation forbids it. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, MemoryWindow>();
  constructor(private readonly now: () => number = Date.now) {}

  async consume(
    key: string,
    { max, windowMs }: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const now = this.now();
    const previous = this.windows.get(key);
    const window =
      !previous || previous.expiresAt <= now
        ? { count: 0, expiresAt: now + windowMs }
        : previous;
    window.count += 1;
    this.windows.set(key, window);

    // Opportunistic bounded cleanup avoids a process-wide timer and works in
    // serverless runtimes where a timer is not guaranteed to run.
    if (this.windows.size > 10_000) {
      for (const [candidate, value] of this.windows) {
        if (value.expiresAt <= now) this.windows.delete(candidate);
      }
    }

    return {
      ok: window.count <= max,
      remaining: Math.max(0, max - window.count),
      resetMs: Math.max(1, window.expiresAt - now),
    };
  }
}

const REDIS_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly client: RedisClientType) {}

  async consume(
    key: string,
    { max, windowMs }: RateLimitOptions,
  ): Promise<RateLimitResult> {
    const value = await this.client.eval(REDIS_SCRIPT, {
      keys: [`sobi:rate-limit:${key}`],
      arguments: [String(windowMs)],
    });
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error("Redis returned an invalid rate-limit response.");
    }
    const count = Number(value[0]);
    const ttl = Math.max(1, Number(value[1]));
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
      throw new Error("Redis returned an invalid rate-limit value.");
    }
    return {
      ok: count <= max,
      remaining: Math.max(0, max - count),
      resetMs: ttl,
    };
  }
}

const globalState = globalThis as unknown as {
  __sobiRateLimitClient?: RedisClientType;
  __sobiRateLimitConnect?: Promise<RedisClientType>;
};

const memoryStore = new MemoryRateLimitStore();
let testStore: RateLimitStore | undefined;

async function redisClient(): Promise<RedisClientType> {
  if (globalState.__sobiRateLimitClient?.isReady) {
    return globalState.__sobiRateLimitClient;
  }
  if (globalState.__sobiRateLimitConnect) return globalState.__sobiRateLimitConnect;
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (!url) throw new Error("RATE_LIMIT_REDIS_URL is not configured.");

  const configuredTimeout = Number(
    process.env.RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS ?? 1_500,
  );
  const connectTimeout = Number.isFinite(configuredTimeout)
    ? Math.max(250, Math.min(configuredTimeout, 10_000))
    : 1_500;
  const client = createClient({
    url,
    socket: { connectTimeout, reconnectStrategy: false },
  });
  client.on("error", () => {
    // The request result below is fail-closed; the application logger must not
    // receive raw Redis URLs or credentials from client error objects.
  });
  globalState.__sobiRateLimitConnect = client.connect().then(() => {
    globalState.__sobiRateLimitClient = client;
    return client;
  });
  try {
    return await globalState.__sobiRateLimitConnect;
  } catch (error) {
    globalState.__sobiRateLimitConnect = undefined;
    client.destroy();
    throw error;
  }
}

async function selectedStore(): Promise<RateLimitStore> {
  if (testStore) return testStore;
  const backend =
    process.env.RATE_LIMIT_BACKEND ??
    (process.env.RATE_LIMIT_REDIS_URL ? "redis" : "memory");
  if (backend === "memory") return memoryStore;
  if (backend !== "redis") throw new Error("Unsupported rate-limit backend.");
  return new RedisRateLimitStore(await redisClient());
}

export async function limit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  if (!Number.isInteger(options.max) || options.max < 1 || options.windowMs < 1) {
    throw new Error("Invalid rate-limit configuration.");
  }
  try {
    return await (await selectedStore()).consume(key, options);
  } catch {
    // Never fall back to process memory after Redis was selected: doing so
    // silently removes the global limit during an outage.
    return { ok: false, remaining: 0, resetMs: 1_000, unavailable: true };
  }
}

/** Unit-test seam; production code must select providers through environment. */
export function setRateLimitStoreForTests(store?: RateLimitStore): void {
  testStore = store;
}

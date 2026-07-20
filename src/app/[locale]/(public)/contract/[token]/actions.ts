"use server";

import { z } from "zod";
import { acceptContractPublic } from "@/engines/contracts/contract-service";
import { headers } from "next/headers";
import { limit, rateLimitKey } from "@/core/security/rate-limit";

const schema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{32}$/),
  name: z.string().trim().min(2).max(120),
});

export async function acceptContractAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const throttle = await limit(
    rateLimitKey("contract-accept", `${parsed.data.token}:${address}`),
    { max: 5, windowMs: 15 * 60_000 },
  );
  if (!throttle.ok) {
    return { ok: false as const, unavailable: throttle.unavailable === true };
  }
  const res = await acceptContractPublic(parsed.data.token, parsed.data.name);
  return res;
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiKey } from "@/engines/integrations/api-key-service";
import { runWithContext } from "@/core/tenancy/context";
import { db } from "@/core/db";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { hasApiScope } from "@/core/security/api-scopes";
import { consumeQuota, QuotaExceededError } from "@/core/billing/quota";
import { createContact } from "@/engines/crm/contact-service";
import { decodeCursor, encodeCursor } from "@/core/api/cursor";

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).nullish(),
  phone: z.string().trim().max(40).nullish(),
  jobTitle: z.string().trim().max(160).nullish(),
  lifecycle: z.string().trim().max(40).optional(),
  source: z.string().trim().max(80).nullish(),
});

function response(
  requestId: string,
  body: Record<string, unknown>,
  status = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(body, {
    status,
    headers: { "X-Request-Id": requestId, ...headers },
  });
}

async function authenticate(req: Request, scope: string, requestId: string) {
  const token = (req.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return { error: response(requestId, { error: { code: "missing_api_key" } }, 401) };

  const address =
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const [keyLimit, addressLimit] = await Promise.all([
    limit(rateLimitKey("api-key", token), { max: 60, windowMs: 60_000 }),
    limit(rateLimitKey("api-address", address), { max: 300, windowMs: 60_000 }),
  ]);
  const throttle = !keyLimit.ok ? keyLimit : addressLimit;
  if (!throttle.ok) {
    return {
      error: response(
        requestId,
        { error: { code: throttle.unavailable ? "rate_limit_unavailable" : "rate_limited" } },
        throttle.unavailable ? 503 : 429,
        { "Retry-After": String(Math.max(1, Math.ceil(throttle.resetMs / 1_000))) },
      ),
    };
  }

  const resolved = await verifyApiKey(token);
  if (!resolved) return { error: response(requestId, { error: { code: "invalid_api_key" } }, 401) };
  if (!hasApiScope(resolved.scopes, scope)) {
    return { error: response(requestId, { error: { code: "insufficient_scope" } }, 403) };
  }
  return { resolved };
}

function context(tenantId: string, permission: string) {
  return {
    tenantId,
    membershipId: "api",
    userId: "api",
    permissions: new Set([permission]),
    isAdmin: false,
    isSuperAdmin: false,
    accessMode: "read-write",
    locale: "en",
  } as const;
}

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  const auth = await authenticate(req, "contacts:read", requestId);
  if (auth.error || !auth.resolved) return auth.error!;

  try {
    const url = new URL(req.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    const pageSize = Number.isInteger(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 50;
    const cursorParam = url.searchParams.get("cursor");
    const cursor = decodeCursor(cursorParam);
    if (cursorParam && !cursor) {
      return response(requestId, { error: { code: "invalid_cursor" } }, 400);
    }

    const rows = await runWithContext(
      context(auth.resolved.tenantId, "crm.contact.read"),
      async () => {
        await consumeQuota("apiRequestsMonthly");
        return db.contact.findMany({
          where: cursor ? { id: { gt: cursor } } : {},
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            lifecycle: true,
            createdAt: true,
          },
          orderBy: { id: "asc" },
          take: pageSize + 1,
        });
      },
    );
    const hasMore = rows.length > pageSize;
    const data = hasMore ? rows.slice(0, pageSize) : rows;
    return response(requestId, {
      data,
      meta: {
        requestId,
        nextCursor: hasMore ? encodeCursor(data.at(-1)!.id) : null,
      },
    });
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return response(requestId, { error: { code: error.code, metric: error.metric } }, 429);
    }
    return response(requestId, { error: { code: "internal_error" } }, 500);
  }
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const auth = await authenticate(req, "contacts:write", requestId);
  if (auth.error || !auth.resolved) return auth.error!;

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return response(requestId, { error: { code: "invalid_json" } }, 400);
  }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return response(requestId, { error: { code: "validation_failed" } }, 422);
  }

  try {
    const contact = await runWithContext(
      context(auth.resolved.tenantId, "crm.contact.create"),
      async () => {
        await consumeQuota("apiRequestsMonthly");
        return createContact(parsed.data);
      },
    );
    return response(requestId, { data: contact, meta: { requestId } }, 201);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return response(requestId, { error: { code: error.code, metric: error.metric } }, 429);
    }
    return response(requestId, { error: { code: "internal_error" } }, 500);
  }
}

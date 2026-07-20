import { NextResponse } from "next/server";
import { verifyApiKey } from "@/engines/integrations/api-key-service";
import { runWithContext } from "@/core/tenancy/context";
import { db } from "@/core/db";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { hasApiScope } from "@/core/security/api-scopes";

/**
 * Public API — list contacts. Authenticated by an API key (Bearer token),
 * which resolves the tenant. Runs inside that tenant's context so the db
 * extension enforces isolation. Rate-limited per key.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 401 });
  }

  const resolved = await verifyApiKey(token);
  if (!resolved) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401 });
  }
  if (!hasApiScope(resolved.scopes, "contacts:read")) {
    return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
  }

  const rl = limit(rateLimitKey("api", token), { max: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.resetMs / 1000))) },
      },
    );
  }

  const contacts = await runWithContext(
    {
      tenantId: resolved.tenantId,
      membershipId: "api",
      userId: "api",
      permissions: new Set(["crm.contact.read"]),
      isAdmin: false,
      isSuperAdmin: false,
      locale: "en",
    },
    () =>
      db.contact.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          lifecycle: true,
        },
        take: 100,
      }),
  );

  return NextResponse.json({ data: contacts });
}

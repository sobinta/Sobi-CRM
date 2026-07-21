import { auth } from "@/core/auth/auth";
import { getPublicDemoConfig } from "@/core/demo/config";
import { hasProvisionedDemoMembership } from "@/core/demo/session-gateway";
import {
  demoRequestAddress,
  isSameOriginDemoRequest,
} from "@/core/demo/request-policy";
import { limit, rateLimitKey } from "@/core/security/rate-limit";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(request: Request): Promise<Response> {
  const config = getPublicDemoConfig();
  if (!config.enabled || !config.password) {
    return Response.json(
      { error: "Demo is unavailable." },
      { status: 404, headers: noStoreHeaders },
    );
  }

  if (
    !isSameOriginDemoRequest(
      request.url,
      request.headers.get("origin"),
      request.headers.get("sec-fetch-site"),
    )
  ) {
    return Response.json(
      { error: "Request rejected." },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const throttle = await limit(
    rateLimitKey("public-demo-session", demoRequestAddress(request.headers)),
    { max: 15, windowMs: 60_000 },
  );
  if (!throttle.ok) {
    return Response.json(
      {
        error: throttle.unavailable
          ? "Demo is temporarily unavailable."
          : "Too many requests.",
      },
      {
        status: throttle.unavailable ? 503 : 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(Math.max(1, Math.ceil(throttle.resetMs / 1_000))),
        },
      },
    );
  }

  if (!(await hasProvisionedDemoMembership(config.email))) {
    return Response.json(
      { error: "Demo is temporarily unavailable." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const response = await auth.api.signInEmail({
    body: {
      email: config.email,
      password: config.password,
      rememberMe: false,
    },
    headers: request.headers,
    asResponse: true,
  });

  if (!response.ok) {
    return Response.json(
      { error: "Demo is temporarily unavailable." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const headers = new Headers({
    ...noStoreHeaders,
    "Content-Type": "application/json",
  });
  for (const cookie of response.headers.getSetCookie()) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

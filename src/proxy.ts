import createProxy from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy } from "./core/security/csp";

const localeProxy = createProxy(routing);

/** Locale negotiation plus a fresh strict-CSP nonce for every rendered page. */
export default function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = localeProxy(request);
  // Compose next-intl's rewrite/redirect response with Next's internal request
  // header override protocol so the renderer can discover and apply the nonce.
  const override = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of override.headers) {
    if (key.startsWith("x-middleware-request-") && !response.headers.has(key)) {
      response.headers.set(key, value);
    }
  }
  const overridden = new Set(
    [
      response.headers.get("x-middleware-override-headers"),
      override.headers.get("x-middleware-override-headers"),
    ]
      .flatMap((value) => value?.split(",") ?? [])
      .map((value) => value.trim())
      .filter(Boolean),
  );
  response.headers.set(
    "x-middleware-override-headers",
    [...overridden].join(","),
  );
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Skip api routes, Next internals, and static files
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

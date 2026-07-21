import { auth } from "@/core/auth/auth";
import { isAllowedDemoAuthPost } from "@/core/demo/auth-policy";
import { getPublicDemoConfig } from "@/core/demo/config";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

export async function POST(request: Request): Promise<Response> {
  const config = getPublicDemoConfig();
  if (config.enabled) {
    const session = await auth.api.getSession({ headers: request.headers });
    const isDemoSession = session?.user.email === config.email;
    if (
      isDemoSession &&
      !isAllowedDemoAuthPost(new URL(request.url).pathname)
    ) {
      return Response.json(
        { error: "Account changes are unavailable in demo mode." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  return handlers.POST(request);
}

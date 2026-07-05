import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale negotiation + prefixing. Auth session guards compose here in Phase 2.
export default createProxy(routing);

export const config = {
  // Skip api routes, Next internals, and static files
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

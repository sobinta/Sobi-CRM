import crypto from "node:crypto";

type Environment = Readonly<Record<string, string | undefined>>;

export function publicDemoEnabled(env: Environment): boolean {
  if (env.PUBLIC_DEMO_ENABLED !== undefined) {
    return env.PUBLIC_DEMO_ENABLED === "true";
  }
  // Preserve a zero-config local preview while production remains explicitly
  // opt-in and is validated during startup.
  return env.NODE_ENV !== "production";
}

export function deriveDemoPassword(authSecret: string): string {
  if (!authSecret) throw new Error("Demo authentication is unavailable.");
  return crypto
    .createHmac("sha256", authSecret)
    .update("sobi-public-demo-credential:v1")
    .digest("base64url");
}

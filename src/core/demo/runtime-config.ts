import { deriveDemoPassword, publicDemoEnabled } from "./config-policy";

export interface PublicDemoConfig {
  enabled: boolean;
  email: string;
  password: string | null;
}

/**
 * Shared by Next.js server code and the standalone provisioning CLI.
 * Never import this module from a Client Component.
 */
export function getRuntimePublicDemoConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): PublicDemoConfig {
  const enabled = publicDemoEnabled(env);
  return {
    enabled,
    email: env.DEMO_LOGIN_EMAIL?.trim().toLowerCase() || "public-demo@sobi.local",
    password: enabled
      ? deriveDemoPassword(env.BETTER_AUTH_SECRET ?? "")
      : null,
  };
}

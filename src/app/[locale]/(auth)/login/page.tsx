import { LoginForm } from "./login-form";
import { getSiteAssetsPublic } from "@/engines/platform-admin/branding-service";
import { getPublicDemoConfig } from "@/core/demo/config";

export default async function LoginPage() {
  const assets = await getSiteAssetsPublic();
  return (
    <LoginForm
      logoSrc={assets.logo}
      demoEnabled={getPublicDemoConfig().enabled}
    />
  );
}

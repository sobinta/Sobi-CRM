import type { ReactNode } from "react";
import { ModuleRail } from "./module-rail";
import { Topbar } from "./topbar";
import { AnnouncementBar } from "./announcement-bar";
import { SessionProvider, type SessionUser } from "./session-context";
import { WorkspacesProvider } from "./workspaces-context";
import { MobileNavProvider } from "./mobile-nav-context";
import { MobileNavOverlay } from "./mobile-nav-overlay";
import { CommandPalette } from "@/components/patterns/command-palette";
import { DemoStatusBar } from "./demo-status-bar";
import { OnboardingTourProvider } from "@/components/onboarding/onboarding-tour";

export interface AnnouncementBarData {
  text: string;
  backgroundColor: string;
  textColor: string;
  animation: "ltr" | "rtl" | "static";
  linkUrl: string | null;
}

export function AppShell({
  children,
  user,
  enabledModuleKeys,
  announcement,
  skipLabel,
  onboardingCompleted,
}: {
  children: ReactNode;
  user: SessionUser;
  enabledModuleKeys: string[];
  announcement?: AnnouncementBarData | null;
  skipLabel: string;
  onboardingCompleted: boolean;
}) {
  return (
    <SessionProvider user={user}>
    <OnboardingTourProvider
      initialCompleted={onboardingCompleted}
      tenantId={user.activeTenantId}
      demo={user.accessMode === "read-only"}
    >
    <WorkspacesProvider
      enabledModuleKeys={enabledModuleKeys}
      isSuperAdmin={user.isSuperAdmin}
      readOnly={user.accessMode === "read-only"}
    >
    <MobileNavProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        <a href="#main-content" className="skip-link">{skipLabel}</a>
        {announcement && <AnnouncementBar {...announcement} />}
        <DemoStatusBar />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Module Rail: always visible on lg+ (collapsible); a slide-in drawer below lg */}
          <div className="hidden lg:flex">
            <ModuleRail />
          </div>
          <MobileNavOverlay>
            <ModuleRail mobile />
          </MobileNavOverlay>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto scroll-smooth">{children}</main>
          </div>
        </div>
      </div>
      <CommandPalette />
    </MobileNavProvider>
    </WorkspacesProvider>
    </OnboardingTourProvider>
    </SessionProvider>
  );
}

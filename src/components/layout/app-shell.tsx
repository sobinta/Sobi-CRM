import type { ReactNode } from "react";
import { ModuleRail } from "./module-rail";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { SessionProvider, type SessionUser } from "./session-context";
import { WorkspacesProvider } from "./workspaces-context";
import { CommandPalette } from "@/components/patterns/command-palette";

export function AppShell({
  children,
  user,
  enabledModuleKeys,
}: {
  children: ReactNode;
  user: SessionUser;
  enabledModuleKeys: string[];
}) {
  return (
    <SessionProvider user={user}>
    <WorkspacesProvider enabledModuleKeys={enabledModuleKeys}>
      <div className="flex h-dvh overflow-hidden">
        <ModuleRail />
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <CommandPalette />
    </WorkspacesProvider>
    </SessionProvider>
  );
}

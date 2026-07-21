"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { composeWorkspaces } from "@/core/module-registry/compose";
import type { WorkspaceDef } from "@/core/module-registry/workspaces";

/**
 * Provides the activation-aware workspace list to the rail and sidebar. The
 * server passes only the enabled module keys (serializable); composition —
 * which needs the icon components — happens here on the client.
 */
const WorkspacesContext = createContext<WorkspaceDef[]>([]);

export function WorkspacesProvider({
  enabledModuleKeys,
  isSuperAdmin = false,
  readOnly = false,
  children,
}: {
  enabledModuleKeys: string[];
  isSuperAdmin?: boolean;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => composeWorkspaces(enabledModuleKeys, isSuperAdmin, readOnly),
    [enabledModuleKeys, isSuperAdmin, readOnly],
  );
  return (
    <WorkspacesContext.Provider value={value}>
      {children}
    </WorkspacesContext.Provider>
  );
}

export function useWorkspaces(): WorkspaceDef[] {
  return useContext(WorkspacesContext);
}

/** Find the workspace owning a pathname (locale-stripped). */
export function findWorkspace(
  list: WorkspaceDef[],
  pathname: string,
): WorkspaceDef {
  return (
    list.find(
      (w) => pathname === w.href || pathname.startsWith(w.href + "/"),
    ) ?? list[0]
  );
}

"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AccessMode } from "@/core/tenancy/context";

export interface SessionTenant {
  id: string;
  name: string;
}

export interface SessionUser {
  name: string;
  email: string;
  initials: string;
  activeTenantId: string;
  tenants: SessionTenant[];
  isSuperAdmin: boolean;
  accessMode: AccessMode;
}

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSessionUser(): SessionUser {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionUser must be used within SessionProvider");
  }
  return ctx;
}

export function useDemoMode(): boolean {
  return useSessionUser().accessMode === "read-only";
}

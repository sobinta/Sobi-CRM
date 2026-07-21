"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppThemeProvider>
      <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
    </AppThemeProvider>
  );
}

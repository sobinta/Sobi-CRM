"use client";

import { useTransition } from "react";
import { Check, ChevronsUpDown, LogOut, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSessionUser } from "./session-context";
import { switchTenantAction, signOutAction } from "./shell-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const t = useTranslations("shell");
  const user = useSessionUser();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTenant(id: string) {
    if (id === user.activeTenantId) return;
    startTransition(async () => {
      await switchTenantAction(id);
      router.refresh();
    });
  }

  function signOut() {
    startTransition(async () => {
      await signOutAction();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("profile")}
        disabled={pending}
        className="ms-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-subtle-ink outline-none focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        {user.initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-[15rem]">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted" dir="ltr">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />

        {user.tenants.length > 1 && (
          <>
            <DropdownMenuLabel>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Workspaces
              </span>
            </DropdownMenuLabel>
            {user.tenants.map((tn) => (
              <DropdownMenuItem
                key={tn.id}
                onSelect={() => switchTenant(tn.id)}
              >
                <span className="flex-1 truncate">{tn.name}</span>
                {tn.id === user.activeTenantId && (
                  <Check className="h-4 w-4 text-brand" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="h-4 w-4 text-ink-muted" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TenantBadge() {
  const user = useSessionUser();
  const active = user.tenants.find((tn) => tn.id === user.activeTenantId);
  if (!active) return null;
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink-muted sm:inline-flex">
      <ChevronsUpDown className="h-3 w-3 text-ink-faint" />
      {active.name}
    </span>
  );
}

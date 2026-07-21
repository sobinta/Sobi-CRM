"use client";

import { useTranslations } from "next-intl";
import { Building2, CheckSquare2, Handshake, UserRound, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuickActions({
  contacts,
  leads,
  deals,
  tasks,
}: {
  contacts: boolean;
  leads: boolean;
  deals: boolean;
  tasks: boolean;
}) {
  const t = useTranslations("dashboard");
  const actions = [
    contacts
      ? { href: "/crm/contacts", label: t("goToContacts"), icon: UserRound }
      : null,
    leads ? { href: "/crm/leads", label: t("goToLeads"), icon: Building2 } : null,
    deals ? { href: "/crm/deals", label: t("goToDeals"), icon: Handshake } : null,
    tasks ? { href: "/ops/tasks", label: t("goToTasks"), icon: CheckSquare2 } : null,
  ].filter(Boolean) as Array<{
    href: "/crm/contacts" | "/crm/leads" | "/crm/deals" | "/ops/tasks";
    label: string;
    icon: typeof UserRound;
  }>;

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="primary" className="shadow-raised">
          <Zap aria-hidden="true" className="h-4 w-4" />
          {t("quickActions")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem key={action.href} asChild>
              <Link href={action.href}>
                <Icon aria-hidden="true" className="h-4 w-4 text-ink-muted" />
                {action.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

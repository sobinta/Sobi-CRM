/**
 * Workspace registry — Phase 1 static definition.
 * From Phase 3 onward this is composed from module manifests and
 * filtered by tenant module activation + user permissions.
 */
import type { LucideIcon } from "lucide-react";
import {
  Users,
  ClipboardCheck,
  Landmark,
  Sparkles,
  ShieldCheck,
  Shapes,
  Crown,
} from "lucide-react";

export interface NavItemDef {
  key: string;
  /** i18n key under "nav." */
  labelKey: string;
  href: string;
}

export interface WorkspaceDef {
  key: string;
  /** i18n key under "workspaces." */
  labelKey: string;
  icon: LucideIcon;
  href: string;
  nav: NavItemDef[];
}

export const workspaces: WorkspaceDef[] = [
  {
    key: "crm",
    labelKey: "crm",
    icon: Users,
    href: "/crm",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/crm" },
      { key: "contacts", labelKey: "contacts", href: "/crm/contacts" },
      { key: "companies", labelKey: "companies", href: "/crm/companies" },
      { key: "leads", labelKey: "leads", href: "/crm/leads" },
      { key: "deals", labelKey: "deals", href: "/crm/deals" },
      { key: "contracts", labelKey: "contracts", href: "/crm/contracts" },
      { key: "campaigns", labelKey: "campaigns", href: "/crm/campaigns" },
      { key: "knowledge", labelKey: "knowledge", href: "/crm/knowledge" },
      { key: "graph", labelKey: "graph", href: "/crm/graph" },
      { key: "reports", labelKey: "reports", href: "/crm/reports" },
      { key: "feed", labelKey: "feed", href: "/crm/activity" },
    ],
  },
  {
    key: "operations",
    labelKey: "operations",
    icon: ClipboardCheck,
    href: "/ops",
    nav: [
      { key: "tasks", labelKey: "tasks", href: "/ops/tasks" },
      { key: "calendar", labelKey: "calendar", href: "/ops/calendar" },
      { key: "files", labelKey: "files", href: "/ops/files" },
    ],
  },
  {
    key: "finance",
    labelKey: "finance",
    icon: Landmark,
    href: "/finance",
    nav: [{ key: "dashboard", labelKey: "dashboard", href: "/finance" }],
  },
  {
    key: "ai",
    labelKey: "ai",
    icon: Sparkles,
    href: "/ai",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/ai" },
      { key: "assistant", labelKey: "assistant", href: "/ai/assistant" },
    ],
  },
  {
    key: "studio",
    labelKey: "studio",
    icon: Shapes,
    href: "/studio",
    nav: [
      { key: "dashboard", labelKey: "dashboard", href: "/studio" },
      { key: "forms", labelKey: "forms", href: "/studio/forms" },
      { key: "entities", labelKey: "entities", href: "/studio/entities" },
      { key: "workflows", labelKey: "workflows", href: "/studio/workflows" },
      { key: "automations", labelKey: "automations", href: "/studio/automations" },
      { key: "rules", labelKey: "rules", href: "/studio/rules" },
      { key: "templates", labelKey: "templates", href: "/studio/templates" },
    ],
  },
  {
    key: "admin",
    labelKey: "admin",
    icon: ShieldCheck,
    href: "/admin",
    nav: [
      { key: "settings", labelKey: "settings", href: "/admin" },
      { key: "users", labelKey: "users", href: "/admin/users" },
      { key: "roles", labelKey: "roles", href: "/admin/roles" },
      { key: "modules", labelKey: "modules", href: "/admin/modules" },
      { key: "integrations", labelKey: "integrations", href: "/admin/integrations" },
      { key: "imports", labelKey: "imports", href: "/admin/imports" },
      { key: "audit", labelKey: "audit", href: "/admin/audit" },
      { key: "health", labelKey: "health", href: "/admin/health" },
    ],
  },
];

/**
 * Cross-tenant super-admin surface — not part of `workspaces`, since it isn't
 * gated by module activation like the others. Appended by `composeWorkspaces`
 * only when the current user has the platform-wide `isSuperAdmin` flag.
 */
export const platformAdminWorkspace: WorkspaceDef = {
  key: "platform-admin",
  labelKey: "platformAdmin",
  icon: Crown,
  href: "/platform-admin",
  nav: [
    { key: "pricing", labelKey: "pricingPlans", href: "/platform-admin" },
    { key: "content", labelKey: "landingContent", href: "/platform-admin/content" },
    { key: "branding", labelKey: "branding", href: "/platform-admin/branding" },
    { key: "announcement", labelKey: "announcementBar", href: "/platform-admin/announcement" },
  ],
};

export function findWorkspaceByPath(pathname: string): WorkspaceDef {
  return (
    workspaces.find(
      (w) => pathname === w.href || pathname.startsWith(w.href + "/"),
    ) ?? workspaces[0]
  );
}

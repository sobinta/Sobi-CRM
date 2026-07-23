import {
  FileText,
  Shapes,
  Workflow,
  Zap,
  Scale,
  LayoutTemplate,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { Chip } from "@/components/ui/chip";

interface Tool {
  href: string;
  /** i18n key under "nav.", or a plain label via `rawLabel`. */
  labelKey?: string;
  rawLabel?: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
}

const tools: Tool[] = [
  { href: "/studio/industries", rawLabel: "Industry templates", description: "Apply a ready-made industry solution — configured entities and sample data on the low-code kernel.", icon: Store, ready: true },
  { href: "/studio/entities", labelKey: "entities", description: "Create custom entities with their own fields, views, and APIs.", icon: Shapes, ready: true },
  { href: "/studio/forms", labelKey: "forms", description: "Design forms with sections, conditional logic, and calculated fields.", icon: FileText, ready: true },
  { href: "/studio/workflows", labelKey: "workflows", description: "Build stage pipelines with approvals, timers, and SLAs.", icon: Workflow, ready: true },
  { href: "/studio/automations", labelKey: "automations", description: "Automate work: triggers, conditions, and actions.", icon: Zap, ready: true },
  { href: "/studio/rules", labelKey: "rules", description: "Reusable business rules for validation and eligibility.", icon: Scale, ready: true },
  { href: "/studio/templates", labelKey: "templates", description: "Documents, emails, and reports as reusable templates.", icon: LayoutTemplate, ready: true },
];

export default async function StudioPage() {
  const tNav = await getTranslations("nav");
  const t = await getTranslations("common");

  return (
    <div>
      <PageHeader
        title="Studio"
        description="Low-code tools to shape the platform to your business — no engineering required."
        helpTopic="studio"
      />
      <div className="mx-auto grid max-w-4xl gap-4 px-6 py-6 sm:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const inner = (
            <div className="flex h-full items-start gap-4 rounded-xl border border-line bg-surface-raised p-5 transition-colors hover:border-brand/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    {tool.rawLabel ?? tNav(tool.labelKey!)}
                  </h3>
                  {!tool.ready && (
                    <Chip tone="neutral" dot={false}>
                      {t("comingSoon")}
                    </Chip>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {tool.description}
                </p>
              </div>
            </div>
          );
          return tool.ready ? (
            <Link key={tool.href} href={tool.href}>
              {inner}
            </Link>
          ) : (
            <div key={tool.href} className="opacity-70">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

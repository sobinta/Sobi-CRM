import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  Landmark,
  Home,
  Megaphone,
  Plane,
  Scissors,
  UtensilsCrossed,
  Sparkles,
  TrendingUp,
  Scale,
  GraduationCap,
  Stethoscope,
  Wrench,
  FolderKanban,
} from "lucide-react";

/**
 * Module catalog — the full set of business modules the platform knows about.
 *
 * `status: "available"` modules are fully built and can be activated.
 * `status: "planned"` modules are registered scaffolds shown as "coming soon"
 * in the activation UI. Activation flips a MODULE feature grant per tenant.
 */

export type ModuleStatus = "available" | "planned";

export interface ModuleCatalogEntry {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: ModuleStatus;
  /** Which reusable engines this module composes (for docs/onboarding). */
  engines: string[];
}

export const MODULE_CATALOG: ModuleCatalogEntry[] = [
  {
    key: "insurance",
    name: "Insurance",
    description:
      "Policies, renewals, claims, carriers, and commission tracking for agencies and brokers.",
    icon: ShieldCheck,
    status: "available",
    engines: ["pipeline", "documents", "finance", "rules"],
  },
  {
    key: "loans",
    name: "Loan & Banking",
    description:
      "Loan applications, bank partners, creditworthiness checklists, and submission tracking.",
    icon: Landmark,
    status: "available",
    engines: ["pipeline", "documents", "finance", "rules"],
  },
  {
    key: "realestate",
    name: "Real Estate",
    description:
      "Properties, buyers and sellers, viewings, offers, contracts, and client matching.",
    icon: Home,
    status: "available",
    engines: ["pipeline", "booking", "documents", "finance"],
  },
  {
    key: "sales",
    name: "Sales & Agency",
    description:
      "Campaigns, proposals, sales targets, and performance for general sales teams.",
    icon: Megaphone,
    status: "available",
    engines: ["crm", "pipeline", "finance"],
  },
  {
    key: "immigration",
    name: "Immigration Agency",
    description:
      "Visa and permit cases, authority submissions, required documents, and deadlines.",
    icon: Plane,
    status: "available",
    engines: ["pipeline", "documents", "rules"],
  },
  {
    key: "barber",
    name: "Barber Shop",
    description:
      "Services, staff, chairs, appointments, walk-ins, and client visit history.",
    icon: Scissors,
    status: "available",
    engines: ["booking"],
  },
  {
    key: "salon",
    name: "Beauty Salon",
    description:
      "Treatment series, before/after photos, consent forms, and bookings.",
    icon: Sparkles,
    status: "available",
    engines: ["booking", "documents"],
  },
  {
    key: "restaurant",
    name: "Restaurant",
    description:
      "Table reservations, guest profiles and allergies, event leads, and loyalty.",
    icon: UtensilsCrossed,
    status: "available",
    engines: ["booking", "pipeline"],
  },
  // --- Planned scaffolds ---
  {
    key: "investment",
    name: "Investment",
    description: "Investor profiles, portfolios, risk tolerance, and advisory notes.",
    icon: TrendingUp,
    status: "planned",
    engines: ["pipeline", "documents"],
  },
  {
    key: "legal",
    name: "Legal / Consulting",
    description: "Cases, deadlines, billing status, and consultation history.",
    icon: Scale,
    status: "planned",
    engines: ["pipeline", "documents"],
  },
  {
    key: "education",
    name: "Education / Admission",
    description: "Students, programs, applications, visa status, and deadlines.",
    icon: GraduationCap,
    status: "planned",
    engines: ["pipeline", "documents"],
  },
  {
    key: "healthcare",
    name: "Healthcare / Clinic",
    description: "Patients, appointments, treatment plans, and GDPR-sensitive records.",
    icon: Stethoscope,
    status: "planned",
    engines: ["booking", "documents"],
  },
  {
    key: "service",
    name: "Service & Maintenance",
    description: "Assets, service tickets, maintenance schedules, and work orders.",
    icon: Wrench,
    status: "planned",
    engines: ["pipeline", "booking"],
  },
  {
    key: "projects",
    name: "Project Management",
    description: "Projects, milestones, budgets, and delivery tracking.",
    icon: FolderKanban,
    status: "planned",
    engines: ["pipeline"],
  },
];

export function getModule(key: string): ModuleCatalogEntry | undefined {
  return MODULE_CATALOG.find((m) => m.key === key);
}

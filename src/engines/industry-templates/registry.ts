import type { FieldDefinition } from "@/core/metadata/types";

/**
 * Industry Templates — curated presets built on the low-code kernel.
 *
 * An industry template is *data, not code*: applying it instantiates a set of
 * EntityDefinitions (with fields) plus sample records on the tenant, all usable
 * immediately through the generic entity workspace. This is how verticals are
 * delivered without a bespoke module per industry — a business activates its
 * industry and gets a configured, customizable starting point.
 */

export interface TemplateEntity {
  key: string;
  nameSingular: string;
  namePlural: string;
  icon?: string;
  titleField: string;
  fields: FieldDefinition[];
  /** Seed records created on first apply (keyed by field key). */
  samples?: Record<string, unknown>[];
}

export interface IndustryTemplate {
  key: string;
  name: string;
  description: string;
  /** Lucide icon name (resolved client-side). */
  icon: string;
  entities: TemplateEntity[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    key: "fitness",
    name: "Fitness Studio",
    description:
      "Members, membership tiers, and class scheduling for a gym or studio.",
    icon: "Dumbbell",
    entities: [
      {
        key: "member",
        nameSingular: "Member",
        namePlural: "Members",
        icon: "Users",
        titleField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true, searchable: true },
          {
            key: "tier",
            label: "Membership",
            type: "select",
            options: [
              { value: "basic", label: "Basic" },
              { value: "premium", label: "Premium" },
              { value: "vip", label: "VIP" },
            ],
          },
          { key: "phone", label: "Phone", type: "phone" },
          { key: "joinedAt", label: "Joined", type: "date" },
        ],
        samples: [
          { name: "Anna Berger", tier: "premium", phone: "+43 660 1234567", joinedAt: "2026-01-15" },
          { name: "Max Huber", tier: "basic", phone: "+43 660 7654321", joinedAt: "2026-03-02" },
        ],
      },
      {
        key: "gym_class",
        nameSingular: "Class",
        namePlural: "Classes",
        icon: "CalendarDays",
        titleField: "title",
        fields: [
          { key: "title", label: "Class", type: "text", required: true, searchable: true },
          { key: "coach", label: "Coach", type: "text" },
          { key: "capacity", label: "Capacity", type: "number" },
          { key: "schedule", label: "Schedule", type: "text" },
        ],
        samples: [
          { title: "Morning HIIT", coach: "Lena", capacity: 16, schedule: "Mon/Wed/Fri 07:00" },
          { title: "Yoga Flow", coach: "Sara", capacity: 20, schedule: "Tue/Thu 18:00" },
        ],
      },
    ],
  },
  {
    key: "dental",
    name: "Dental Clinic",
    description:
      "Patients, visit history, and treatment plans for a dental or medical practice.",
    icon: "Stethoscope",
    entities: [
      {
        key: "patient",
        nameSingular: "Patient",
        namePlural: "Patients",
        icon: "Users",
        titleField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true, searchable: true },
          { key: "phone", label: "Phone", type: "phone" },
          { key: "lastVisit", label: "Last visit", type: "date" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
        samples: [
          { name: "Julia Mayer", phone: "+43 1 2345678", lastVisit: "2026-06-20", notes: "Sensitive teeth." },
          { name: "Tom Fischer", phone: "+43 1 8765432", lastVisit: "2026-07-01", notes: "" },
        ],
      },
      {
        key: "treatment",
        nameSingular: "Treatment",
        namePlural: "Treatments",
        icon: "ClipboardList",
        titleField: "title",
        fields: [
          { key: "title", label: "Treatment", type: "text", required: true, searchable: true },
          { key: "patientName", label: "Patient", type: "text" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "planned", label: "Planned" },
              { value: "in_progress", label: "In progress" },
              { value: "done", label: "Done" },
            ],
          },
          { key: "cost", label: "Cost", type: "currency" },
        ],
        samples: [
          { title: "Cleaning", patientName: "Julia Mayer", status: "done", cost: 120 },
          { title: "Filling", patientName: "Tom Fischer", status: "planned", cost: 240 },
        ],
      },
    ],
  },
  {
    key: "consulting",
    name: "Consulting Firm",
    description:
      "Clients and engagements with status and value for a professional-services firm.",
    icon: "Briefcase",
    entities: [
      {
        key: "client_account",
        nameSingular: "Client",
        namePlural: "Clients",
        icon: "Building2",
        titleField: "name",
        fields: [
          { key: "name", label: "Name", type: "text", required: true, searchable: true },
          { key: "sector", label: "Sector", type: "text" },
          { key: "since", label: "Client since", type: "date" },
        ],
        samples: [
          { name: "Nordwind GmbH", sector: "Logistics", since: "2025-09-01" },
          { name: "Helios AG", sector: "Energy", since: "2026-02-11" },
        ],
      },
      {
        key: "engagement",
        nameSingular: "Engagement",
        namePlural: "Engagements",
        icon: "Handshake",
        titleField: "title",
        fields: [
          { key: "title", label: "Engagement", type: "text", required: true, searchable: true },
          { key: "clientName", label: "Client", type: "text" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "proposal", label: "Proposal" },
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
            ],
          },
          { key: "value", label: "Value", type: "currency" },
        ],
        samples: [
          { title: "Supply-chain audit", clientName: "Nordwind GmbH", status: "active", value: 45000 },
          { title: "Market entry study", clientName: "Helios AG", status: "proposal", value: 60000 },
        ],
      },
    ],
  },
];

export function getIndustryTemplate(key: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.key === key);
}

import type { EntityMetadata } from "@/core/metadata/types";
import { registerBuiltinEntity } from "@/core/metadata/registry";

/**
 * Built-in CRM entity metadata. Registered at module load so forms, views,
 * search, and the Entity Builder all read CRM entities from the same metadata
 * source as custom entities.
 */

export const contactEntity: EntityMetadata = {
  key: "contact",
  nameSingular: "Contact",
  namePlural: "Contacts",
  icon: "user",
  source: "builtin",
  module: "crm",
  titleField: "fullName",
  fields: [
    { key: "firstName", label: "First name", type: "text", required: true, searchable: true },
    { key: "lastName", label: "Last name", type: "text", required: true, searchable: true },
    { key: "email", label: "Email", type: "email", searchable: true },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "jobTitle", label: "Job title", type: "text" },
    {
      key: "lifecycle",
      label: "Lifecycle",
      type: "select",
      default: "lead",
      options: [
        { value: "lead", label: "Lead", tone: "info" },
        { value: "prospect", label: "Prospect", tone: "warning" },
        { value: "customer", label: "Customer", tone: "positive" },
        { value: "inactive", label: "Inactive", tone: "neutral" },
      ],
    },
    { key: "source", label: "Source", type: "text" },
  ],
};

export const companyEntity: EntityMetadata = {
  key: "company",
  nameSingular: "Company",
  namePlural: "Companies",
  icon: "building-2",
  source: "builtin",
  module: "crm",
  titleField: "name",
  fields: [
    { key: "name", label: "Name", type: "text", required: true, searchable: true },
    { key: "domain", label: "Domain", type: "text", searchable: true },
    { key: "industry", label: "Industry", type: "text" },
    {
      key: "size",
      label: "Size",
      type: "select",
      options: [
        { value: "1-10", label: "1–10" },
        { value: "11-50", label: "11–50" },
        { value: "51-200", label: "51–200" },
        { value: "201-1000", label: "201–1000" },
        { value: "1000+", label: "1000+" },
      ],
    },
    { key: "phone", label: "Phone", type: "phone" },
    { key: "website", label: "Website", type: "url" },
  ],
};

export const leadEntity: EntityMetadata = {
  key: "lead",
  nameSingular: "Lead",
  namePlural: "Leads",
  icon: "sparkle",
  source: "builtin",
  module: "crm",
  titleField: "title",
  fields: [
    { key: "title", label: "Title", type: "text", required: true, searchable: true },
    { key: "companyName", label: "Company", type: "text", searchable: true },
    { key: "email", label: "Email", type: "email", searchable: true },
    { key: "phone", label: "Phone", type: "phone" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "new",
      options: [
        { value: "new", label: "New", tone: "info" },
        { value: "working", label: "Working", tone: "warning" },
        { value: "qualified", label: "Qualified", tone: "positive" },
        { value: "unqualified", label: "Unqualified", tone: "neutral" },
        { value: "converted", label: "Converted", tone: "brand" },
      ],
    },
    { key: "score", label: "Score", type: "number", min: 0, max: 100, default: 0 },
    { key: "estimatedValue", label: "Estimated value", type: "currency" },
    { key: "source", label: "Source", type: "text" },
  ],
};

export const dealEntity: EntityMetadata = {
  key: "deal",
  nameSingular: "Deal",
  namePlural: "Deals",
  icon: "handshake",
  source: "builtin",
  module: "crm",
  titleField: "title",
  fields: [
    { key: "title", label: "Title", type: "text", required: true, searchable: true },
    { key: "value", label: "Value", type: "currency", default: 0 },
    { key: "expectedCloseAt", label: "Expected close", type: "date" },
  ],
};

let registered = false;
export function registerCrmEntities(): void {
  if (registered) return;
  registered = true;
  registerBuiltinEntity(contactEntity);
  registerBuiltinEntity(companyEntity);
  registerBuiltinEntity(leadEntity);
  registerBuiltinEntity(dealEntity);
}

// Register on import.
registerCrmEntities();

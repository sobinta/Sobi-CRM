import type { ExprNode } from "@/core/rules/expression";

/**
 * Metadata types — the shared vocabulary for entities and fields.
 *
 * Built-in entities register a definition of this shape in code; custom
 * entities store the same shape in EntityDefinition. Forms, views, search,
 * validation (→ Zod), and the Entity Builder all read from here.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "currency"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "multiselect"
  | "email"
  | "phone"
  | "url"
  | "relation"
  | "user"
  | "json";

export interface FieldOption {
  value: string;
  label: string | Record<string, string>;
  /** Chip tone for status-like selects. */
  tone?: string;
}

export interface FieldDefinition {
  key: string;
  /** i18n-capable label map, or a plain string. */
  label: string | Record<string, string>;
  type: FieldType;
  required?: boolean;
  /** For select/multiselect. */
  options?: FieldOption[];
  /** For relation fields: the target entity key. */
  relationTo?: string;
  /** Default value. */
  default?: unknown;
  placeholder?: string;
  helpText?: string;
  /** Min/max for number/currency/text length. */
  min?: number;
  max?: number;
  /** Show only when this rule condition is true (form conditional logic). */
  visibleWhen?: ExprNode;
  /** Computed value expression (calculated fields). */
  computed?: ExprNode;
  /** Field is system-managed and not user-editable. */
  system?: boolean;
  /** Include in full-text search. */
  searchable?: boolean;
  /** Hidden from new input while historical values remain readable. */
  archived?: boolean;
}

export interface EntityMetadata {
  key: string;
  nameSingular: string;
  namePlural: string;
  icon?: string;
  /** "builtin" (real table) or "custom" (CustomRecord). */
  source: "builtin" | "custom";
  /** Permission module prefix, e.g. "crm" → "crm.contact.read". */
  module: string;
  fields: FieldDefinition[];
  /** Field key used as the record's display title. */
  titleField: string;
}

export function labelFor(
  label: string | Record<string, string>,
  locale: string,
): string {
  if (typeof label === "string") return label;
  return label[locale] ?? label.en ?? Object.values(label)[0] ?? "";
}

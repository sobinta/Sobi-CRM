import type { ExprNode } from "@/core/rules/expression";

/**
 * Form definitions — the Form Builder's output, layered over entity metadata.
 *
 * A form arranges an entity's fields into sections/tabs, and can override
 * per-field conditional visibility, requiredness, and computed values without
 * changing the underlying entity. Definitions are versioned via ConfigVersion.
 */

export interface FormFieldRef {
  /** Field key from the entity metadata. */
  key: string;
  /** Override the metadata label (optional, i18n map or string). */
  label?: string | Record<string, string>;
  /** Show only when this condition is true. */
  visibleWhen?: ExprNode;
  /** Compute the value (read-only calculated field). */
  computed?: ExprNode;
  /** Override requiredness. */
  required?: boolean;
  /** Column span within the section grid (1 or 2). */
  span?: 1 | 2;
}

export interface FormSection {
  id: string;
  title?: string | Record<string, string>;
  /** Collapse this whole section when the condition is false. */
  visibleWhen?: ExprNode;
  fields: FormFieldRef[];
}

export interface FormDefinition {
  /** Entity key the form is for (e.g. "contact"). */
  entityKey: string;
  key: string;
  name: string;
  sections: FormSection[];
}

export function emptyForm(entityKey: string, name: string): FormDefinition {
  return {
    entityKey,
    key: "default",
    name,
    sections: [{ id: crypto.randomUUID(), title: "Details", fields: [] }],
  };
}

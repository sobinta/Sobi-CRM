import type { ChipProps } from "@/components/ui/chip";
import { labelFor, type EntityMetadata } from "@/core/metadata/types";

/**
 * Resolve a select field value to a chip tone + label from entity metadata.
 * Powers the consistent status-chip grammar across CRM lists and details.
 */
export function resolveOptionChip(
  meta: EntityMetadata,
  fieldKey: string,
  value: string | null | undefined,
  locale = "en",
): { label: string; tone: ChipProps["tone"] } {
  const field = meta.fields.find((f) => f.key === fieldKey);
  const option = field?.options?.find((o) => o.value === value);
  return {
    label: option ? labelFor(option.label, locale) : value ?? "—",
    tone: (option?.tone as ChipProps["tone"]) ?? "neutral",
  };
}

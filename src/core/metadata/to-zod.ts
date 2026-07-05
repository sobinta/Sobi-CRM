import { z } from "zod";
import type { EntityMetadata, FieldDefinition } from "./types";

/**
 * Generate a Zod schema from entity metadata.
 *
 * The single source of validation, shared client and server. Field type +
 * required/min/max map to Zod constraints; computed and system fields are
 * omitted from user input. Conditional (visibleWhen) requiredness is enforced
 * at a higher layer by the Rules engine, since it depends on other values.
 */

function fieldSchema(field: FieldDefinition): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case "number":
    case "currency": {
      let n = z.coerce.number();
      if (field.min != null) n = n.min(field.min);
      if (field.max != null) n = n.max(field.max);
      schema = n;
      break;
    }
    case "boolean":
      schema = z.coerce.boolean();
      break;
    case "date":
    case "datetime":
      schema = z.coerce.date();
      break;
    case "email":
      schema = z.email();
      break;
    case "url":
      schema = z.url();
      break;
    case "select":
      schema =
        field.options && field.options.length > 0
          ? z.enum(
              field.options.map((o) => o.value) as [string, ...string[]],
            )
          : z.string();
      break;
    case "multiselect":
      schema = z.array(z.string());
      break;
    case "json":
      schema = z.unknown();
      break;
    default: {
      let s = z.string();
      if (field.min != null) s = s.min(field.min);
      if (field.max != null) s = s.max(field.max);
      schema = s;
    }
  }

  if (!field.required) {
    schema = schema.optional().nullable();
  }
  return schema;
}

export function buildZodSchema(
  meta: EntityMetadata,
  opts?: { only?: string[] },
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of meta.fields) {
    if (field.system || field.computed) continue;
    if (opts?.only && !opts.only.includes(field.key)) continue;
    shape[field.key] = fieldSchema(field);
  }
  return z.object(shape);
}

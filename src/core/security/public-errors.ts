import { ForbiddenError } from "@/core/rbac/guard";
import {
  TenantMismatchError,
  TenantSecurityError,
} from "@/core/tenancy/errors";
import { logger } from "@/core/observability/logger";
import { UnsafeOutboundUrlError } from "./outbound-url";
import { UnsafeUploadError } from "./upload-policy";
import { EntitlementRequiredError } from "@/core/billing/quota";

export type PublicErrorCode =
  | "conflict"
  | "forbidden"
  | "invalid"
  | "not_found"
  | "operation_failed";

/** Convert internal exceptions to stable client-safe codes, never messages. */
export function publicErrorCode(error: unknown): PublicErrorCode {
  if (error instanceof TenantMismatchError) return "not_found";
  if (error instanceof ForbiddenError) return "forbidden";
  if (error instanceof EntitlementRequiredError) return "forbidden";
  if (error instanceof UnsafeOutboundUrlError || error instanceof UnsafeUploadError) {
    return "invalid";
  }
  if ((error as { code?: unknown } | null)?.code === "P2002") return "conflict";
  return "operation_failed";
}

export function reportPublicActionError(error: unknown): PublicErrorCode {
  const code = publicErrorCode(error);
  logger.warn("Server action failed", {
    publicCode: code,
    errorType:
      error instanceof TenantSecurityError
        ? "tenant-security"
        : error instanceof Error
          ? error.name
          : typeof error,
  });
  return code;
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const mode =
    process.env.TENANT_DB_SECURITY_CHECK ??
    (process.env.NODE_ENV === "production" ? "strict" : "warn");
  if (mode === "off" || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const { logger } = await import("@/core/observability/logger");
  try {
    const {
      inspectTenantDatabaseSecurity,
      tenantDatabaseSecurityProblems,
    } = await import("@/core/db/security-check");
    const snapshot = await inspectTenantDatabaseSecurity();
    const problems = tenantDatabaseSecurityProblems(snapshot);
    if (problems.length === 0) {
      logger.info("Tenant database security check passed", {
        role: snapshot.username,
      });
      return;
    }

    const message = `Tenant database security check failed: ${problems.join("; ")}`;
    if (mode === "strict") throw new Error(message);
    logger.warn(message, { role: snapshot.username });
  } catch (error) {
    if (mode === "strict") throw error;
    logger.warn("Tenant database security check could not complete", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

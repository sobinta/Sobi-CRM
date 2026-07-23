import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const databaseCapabilityRule = {
  meta: {
    type: "problem",
    schema: [],
  },
  create(context) {
    const normalized = context.filename.replaceAll("\\", "/");
    const marker = "/src/";
    const file = normalized.includes(marker)
      ? normalized.slice(normalized.indexOf(marker) + marker.length)
      : normalized;
    const allowed = (exact, prefixes = []) =>
      exact.includes(file) || prefixes.some((prefix) => file.startsWith(prefix));

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (
          source === "@/core/db/system" &&
          !allowed(
            [
              "core/jobs/runner.ts",
              "core/event-bus/outbox.ts",
              "core/billing/quota.ts",
              "core/billing/plan-gateway.ts",
              "core/tenancy/rls.integration.test.ts",
              "core/tenancy/provisioning.ts",
              "core/demo/provision-demo.ts",
              "core/demo/session-gateway.ts",
              "engines/tasks/jobs.ts",
              "engines/portal/portal-service.ts",
              "engines/integrations/api-key-service.ts",
              "engines/contracts/contract-service.ts",
              "engines/contracts/letterhead.ts",
              "engines/campaigns/inbound-email.ts",
            ],
            ["engines/platform-admin/"],
          )
        ) {
          context.report({
            node,
            message:
              "The system database capability is restricted to audited gateways and dispatchers.",
          });
        }

        if (
          source === "@/core/db/identity" &&
          !allowed(
            [
              "core/branding/get-branding.ts",
              "components/layout/shell-actions.ts",
              "core/tenancy/rls.integration.test.ts",
            ],
            ["core/auth/"],
          )
        ) {
          context.report({
            node,
            message:
              "The identity database capability is restricted to auth and session gateways.",
          });
        }

        if (
          (source === "@/core/db/factory" ||
            source === "./db/factory" ||
            source === "./factory") &&
          !allowed([
            "core/db.ts",
            "core/db/identity.ts",
            "core/db/security-check.ts",
            "core/db/system.ts",
          ])
        ) {
          context.report({
            node,
            message:
              "Prisma client construction is restricted to database boundary modules.",
          });
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".vercel/**",
  ]),
  // --- Architectural boundaries (future package seams) ---
  // core → may not import engines/modules; engines → may not import modules;
  // modules → may not import other modules.
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/engines/*", "@/modules/*"],
              message:
                "core/ is the platform kernel — it must not depend on engines or modules.",
            },
          ],
        },
      ],
    },
  },
  // Integration tests verify cross-layer security boundaries and may exercise
  // an engine through its public API. Production core modules remain isolated.
  {
    files: ["src/core/**/*.integration.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/engines/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*"],
              message:
                "engines/ are reusable — they must not depend on business modules.",
            },
          ],
        },
      ],
    },
  },
  // Database escape hatches are capability imports, not general utilities.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      sobi: {
        rules: {
          "database-capabilities": databaseCapabilityRule,
        },
      },
    },
    rules: {
      "sobi/database-capabilities": "error",
    },
  },
]);

export default eslintConfig;

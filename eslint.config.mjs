import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
]);

export default eslintConfig;

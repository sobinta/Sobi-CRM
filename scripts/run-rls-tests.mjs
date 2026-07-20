import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(
  executable,
  ["vitest", "run", "src/core/tenancy/rls.integration.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, RUN_DATABASE_INTEGRATION_TESTS: "true" },
  },
);

process.exit(result.status ?? 1);

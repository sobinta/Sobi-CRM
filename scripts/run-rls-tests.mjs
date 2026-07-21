import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [vitest, "run", "src/core/tenancy/rls.integration.test.ts", "--reporter=verbose"],
  {
    stdio: "inherit",
    env: { ...process.env, RUN_DATABASE_INTEGRATION_TESTS: "true" },
  },
);

if (result.error) {
  console.error(result.error);
}
process.exit(result.status ?? 1);

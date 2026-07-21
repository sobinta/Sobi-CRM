import { describe, expect, it } from "vitest";
import { legacyManagementRedirect } from "./legacy-management-routes";

describe("legacy management route redirects", () => {
  it("maps every legacy surface to its canonical CRM destination", () => {
    expect(legacyManagementRedirect("fa", "dashboard")).toBe("/fa/crm");
    expect(legacyManagementRedirect("de", "activity")).toBe("/de/crm/activity");
    expect(legacyManagementRedirect("en", "insights")).toBe("/en/crm/reports/insights");
  });

  it("preserves a safe report selection and rejects an unknown locale", () => {
    expect(legacyManagementRedirect("xx", "reports", { r: "pipeline" })).toBe(
      "/en/crm/reports?r=pipeline",
    );
  });
});

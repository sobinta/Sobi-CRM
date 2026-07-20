import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/core/rbac/guard";
import { TenantMismatchError } from "@/core/tenancy/errors";
import { publicErrorCode } from "./public-errors";

describe("public error mapping", () => {
  it("does not expose internal exception messages", () => {
    expect(publicErrorCode(new Error("postgresql://user:secret@db"))).toBe(
      "operation_failed",
    );
    expect(publicErrorCode(new TenantMismatchError())).toBe("not_found");
    expect(publicErrorCode(new ForbiddenError("secret.permission"))).toBe("forbidden");
    expect(publicErrorCode({ code: "P2002", meta: { target: "email" } })).toBe(
      "conflict",
    );
  });
});

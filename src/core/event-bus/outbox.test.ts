import { describe, expect, it } from "vitest";
import { DURABLE_EVENT_CONSUMERS } from "./outbox";

describe("durable event consumers", () => {
  it("dispatches automation and webhook work independently", () => {
    expect(DURABLE_EVENT_CONSUMERS).toEqual(["automation", "webhooks"]);
    expect(new Set(DURABLE_EVENT_CONSUMERS).size).toBe(
      DURABLE_EVENT_CONSUMERS.length,
    );
  });
});

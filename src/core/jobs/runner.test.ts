import { describe, expect, it } from "vitest";
import { jobRetryDelayMs } from "./runner";

describe("job retry backoff", () => {
  it("grows exponentially and caps at fifteen minutes", () => {
    expect(jobRetryDelayMs(1, () => 0.5)).toBe(15_000);
    expect(jobRetryDelayMs(2, () => 0.5)).toBe(30_000);
    expect(jobRetryDelayMs(20, () => 0.5)).toBe(15 * 60_000);
  });

  it("adds bounded jitter", () => {
    expect(jobRetryDelayMs(1, () => 0)).toBe(12_000);
    expect(jobRetryDelayMs(1, () => 1)).toBe(18_000);
  });
});

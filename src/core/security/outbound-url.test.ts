import { describe, expect, it } from "vitest";
import {
  isPublicNetworkAddress,
  resolveOutboundUrl,
  UnsafeOutboundUrlError,
} from "./outbound-url";

describe("outbound webhook URL policy", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "169.254.169.254",
    "172.31.0.1",
    "192.168.1.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("blocks non-public address %s", (address) => {
    expect(isPublicNetworkAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "allows public address %s",
    (address) => {
      expect(isPublicNetworkAddress(address)).toBe(true);
    },
  );

  it("rejects credentials, non-HTTP schemes, and private literals", async () => {
    await expect(resolveOutboundUrl("file:///etc/passwd")).rejects.toBeInstanceOf(
      UnsafeOutboundUrlError,
    );
    await expect(
      resolveOutboundUrl("https://user:pass@example.com/hook"),
    ).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
    await expect(resolveOutboundUrl("http://127.0.0.1/hook")).rejects.toBeInstanceOf(
      UnsafeOutboundUrlError,
    );
  });

  it("rejects a DNS answer set containing any private address", async () => {
    await expect(
      resolveOutboundUrl("https://hooks.example/hook", async () => [
        { address: "8.8.8.8", family: 4 },
        { address: "10.0.0.1", family: 4 },
      ]),
    ).rejects.toBeInstanceOf(UnsafeOutboundUrlError);
  });

  it("returns the validated address to pin into the connection", async () => {
    await expect(
      resolveOutboundUrl("https://hooks.example/hook", async () => [
        { address: "8.8.8.8", family: 4 },
      ]),
    ).resolves.toMatchObject({ address: "8.8.8.8", family: 4 });
  });
});

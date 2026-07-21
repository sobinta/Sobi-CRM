import { describe, expect, it } from "vitest";
import { createSupportTicketSchema, supportReplySchema, supportText } from "./schemas";

describe("support input policy", () => {
  it("normalizes safe plain text without interpreting markup", () => {
    expect(supportText("  hello\r\n<script>alert(1)</script>\u0000  ")).toBe("hello\n<script>alert(1)</script>");
  });

  it("rejects oversized bodies and malformed retry ids", () => {
    expect(createSupportTicketSchema.safeParse({ subject: "Valid subject", body: "x".repeat(4_001) }).success).toBe(false);
    expect(supportReplySchema.safeParse({ ticketId: "not-a-cuid", body: "hello", clientMessageId: "bad id" }).success).toBe(false);
  });

  it("accepts a bounded ticket payload", () => {
    const parsed = createSupportTicketSchema.parse({ subject: " Login issue ", body: " Please help ", category: "technical" });
    expect(parsed).toMatchObject({ subject: "Login issue", body: "Please help", category: "technical", channel: "TICKET" });
  });
});

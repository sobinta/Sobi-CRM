import { z } from "zod";

export const SUPPORT_SUBJECT_MAX = 160;
export const SUPPORT_MESSAGE_MAX = 4_000;

export const ticketIdSchema = z.string().cuid();
export const clientMessageIdSchema = z.string().trim().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/);

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(SUPPORT_SUBJECT_MAX),
  body: z.string().trim().min(1).max(SUPPORT_MESSAGE_MAX),
  category: z.enum(["general", "billing", "technical", "feature"]).default("general"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  channel: z.enum(["TICKET", "LIVE_CHAT"]).default("TICKET"),
  clientMessageId: clientMessageIdSchema.optional(),
});

export const supportReplySchema = z.object({
  ticketId: ticketIdSchema,
  body: z.string().trim().min(1).max(SUPPORT_MESSAGE_MAX),
  clientMessageId: clientMessageIdSchema.optional(),
});

export const supportOperatorFilterSchema = z.object({
  tenantId: z.string().cuid().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignee: z.enum(["mine", "unassigned", "all"]).default("all"),
  minAgeHours: z.number().int().min(0).max(8_760).optional(),
  take: z.number().int().min(1).max(100).default(50),
});

export function supportText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim();
}

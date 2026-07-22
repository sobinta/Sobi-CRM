import type { ChipProps } from "@/components/ui/chip";

/** Status → chip tone, shared by the leads list and detail page. */
export const LEAD_STATUS_TONE: Record<string, ChipProps["tone"]> = {
  new: "info",
  working: "warning",
  qualified: "positive",
  unqualified: "neutral",
  converted: "brand",
};

export const LEAD_STATUSES = [
  "new",
  "working",
  "qualified",
  "unqualified",
  "converted",
] as const;

export const LEAD_SOURCES = [
  "website",
  "manual",
  "chatbot",
  "telegram",
  "chatbox",
] as const;

/** 0-100 AI fit score → chip tone. */
export function leadScoreTone(score: number): ChipProps["tone"] {
  if (score >= 70) return "positive";
  if (score >= 40) return "warning";
  if (score > 0) return "danger";
  return "neutral";
}

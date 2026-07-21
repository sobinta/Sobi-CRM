export const CALENDAR_SOURCES = [
  "event",
  "task",
  "deal",
  "campaign",
  "policy",
  "contract",
] as const;

export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

export interface CalendarItemDTO {
  id: string;
  source: CalendarSource;
  sourceId: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  type: string;
  status: string | null;
  tone: string;
  href: string;
  ownerId: string | null;
  hasReminder: boolean;
  editable: boolean;
  description?: string | null;
  location?: string | null;
  reminderOffsets?: number[];
}

export interface UnifiedCalendarResult {
  items: CalendarItemDTO[];
  unavailableSources: CalendarSource[];
  truncated: boolean;
}

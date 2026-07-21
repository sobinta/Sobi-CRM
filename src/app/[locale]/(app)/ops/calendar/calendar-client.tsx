"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useDemoMode, useSessionUser } from "@/components/layout/session-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CALENDAR_SOURCES,
  type CalendarItemDTO,
  type CalendarSource,
  type UnifiedCalendarResult,
} from "@/engines/calendar/calendar-types";
import {
  calendarAnchorForMonth,
  calendarMonthIdentity,
  dateKey,
  moveCalendarMonth,
  type CalendarDayCell,
  type CalendarMode,
} from "@/engines/calendar/calendar-date-adapter";
import {
  createEventAction,
  deleteEventAction,
  searchCalendarAction,
  updateEventAction,
} from "../actions";
import { BusinessCustomFields } from "@/components/patterns/business-custom-fields";

const SOURCE_STYLES: Record<CalendarSource, string> = {
  event: "border-brand bg-brand-subtle text-brand-subtle-ink",
  task: "border-info bg-info-subtle text-info",
  deal: "border-accent bg-accent-subtle text-accent",
  campaign: "border-positive bg-positive-subtle text-positive",
  policy: "border-warning bg-warning-subtle text-warning",
  contract: "border-danger bg-danger-subtle text-danger",
};

const REMINDER_OPTIONS = [0, 15, 60, 1_440] as const;

function itemDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function isWithin(item: CalendarItemDTO, range: { from: string; to: string }): boolean {
  return item.startAt >= range.from && item.startAt < range.to;
}

function demoEventStorageKey(tenantId: string) {
  return `sobi:demo-calendar-events:${tenantId}`;
}

function readDemoEvents(key: string): CalendarItemDTO[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemoEvents(key: string, items: CalendarItemDTO[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Demo still works in memory when browser storage is unavailable.
  }
}

export function CalendarWorkspace({
  mode,
  anchor,
  days,
  initialResult,
  range,
}: {
  mode: CalendarMode;
  anchor: string;
  days: CalendarDayCell[];
  initialResult: UnifiedCalendarResult;
  range: { from: string; to: string };
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const router = useRouter();
  const demo = useDemoMode();
  const user = useSessionUser();
  const [demoEvents, setDemoEvents] = useState<CalendarItemDTO[]>([]);
  const [eventOpen, setEventOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarItemDTO | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<UnifiedCalendarResult | null>(null);
  const [pending, startTransition] = useTransition();
  const storageKey = demoEventStorageKey(user.activeTenantId);
  const month = calendarMonthIdentity(mode, anchor);
  const today = dateKey(new Date());

  useEffect(() => {
    if (!demo) return;
    const timer = window.setTimeout(() => setDemoEvents(readDemoEvents(storageKey)), 0);
    return () => window.clearTimeout(timer);
  }, [demo, storageKey]);

  const items = useMemo(
    () => [
      ...initialResult.items,
      ...demoEvents.filter((item) => isWithin(item, range)),
    ],
    [demoEvents, initialResult.items, range],
  );
  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItemDTO[]>();
    for (const item of items) {
      const key = itemDateKey(item.startAt);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const primaryMonthLabel = mode === "jalali"
    ? `${t(`jalaliMonths.${month.month}`)} ${new Intl.NumberFormat(locale).format(month.year)}`
    : new Intl.DateTimeFormat(locale, { calendar: "gregory", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T00:00:00.000Z`));
  const weekdayKeys = mode === "jalali"
    ? ["sat", "sun", "mon", "tue", "wed", "thu", "fri"]
    : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const years = Array.from({ length: 9 }, (_, index) => month.year - 4 + index);

  function navigate(nextMode: CalendarMode, nextAnchor: string) {
    router.replace(`/ops/calendar?mode=${nextMode}&anchor=${nextAnchor}`, { scroll: false });
  }

  function openCreate(day?: CalendarDayCell) {
    setEditing(day ? {
      id: "new", source: "event", sourceId: "", title: "", startAt: `${day.key}T09:00:00.000Z`,
      endAt: `${day.key}T10:00:00.000Z`, allDay: false, type: "appointment", status: null,
      tone: "brand", href: "", ownerId: null, hasReminder: false, editable: true,
      reminderOffsets: [],
    } : null);
    setEventOpen(true);
  }

  function onMonthSelection(year: number, selectedMonth: number) {
    navigate(mode, calendarAnchorForMonth(mode, year, selectedMonth));
  }

  function onEventSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("date"));
    const start = String(form.get("start") || "09:00");
    const end = String(form.get("end") || start);
    const reminderOffsets = REMINDER_OPTIONS.filter((offset) => form.get(`reminder-${offset}`) === "on");
    const payload = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      type: String(form.get("type") ?? "appointment"),
      startAt: new Date(`${date}T${start}:00.000Z`).toISOString(),
      endAt: new Date(`${date}T${end}:00.000Z`).toISOString(),
      allDay: form.get("allDay") === "on",
      location: String(form.get("location") ?? ""),
      tone: String(form.get("tone") ?? "brand"),
      reminderOffsets,
      customFields: JSON.parse(String(form.get("customFields") || "{}")),
    };

    if (demo) {
      const all = readDemoEvents(storageKey);
      const id = editing?.sourceId || `demo-${crypto.randomUUID()}`;
      const next: CalendarItemDTO = {
        id: `event:${id}:start`, source: "event", sourceId: id, title: payload.title,
        startAt: payload.startAt, endAt: payload.endAt, allDay: payload.allDay,
        type: payload.type, status: null, tone: payload.tone, href: "/ops/calendar",
        ownerId: null, hasReminder: reminderOffsets.length > 0, editable: true,
        description: payload.description, location: payload.location, reminderOffsets,
      };
      const updated = [...all.filter((item) => item.sourceId !== id), next];
      writeDemoEvents(storageKey, updated);
      setDemoEvents(updated);
      setEventOpen(false);
      return;
    }

    startTransition(async () => {
      const response = editing?.sourceId
        ? await updateEventAction(editing.sourceId, payload)
        : await createEventAction(payload);
      if (response.ok) {
        setEventOpen(false);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!editing?.sourceId) return;
    if (demo) {
      const updated = readDemoEvents(storageKey).filter((item) => item.sourceId !== editing.sourceId);
      writeDemoEvents(storageKey, updated);
      setDemoEvents(updated);
      setEventOpen(false);
      return;
    }
    startTransition(async () => {
      const response = await deleteEventAction(editing.sourceId);
      if (response.ok) {
        setEventOpen(false);
        router.refresh();
      }
    });
  }

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sources = CALENDAR_SOURCES.filter((source) => form.get(`source-${source}`) === "on");
    startTransition(async () => {
      const response = await searchCalendarAction({
        from: form.get("from"), to: form.get("to"), text: form.get("text") || undefined,
        sources: sources.length ? sources : undefined, status: form.get("status") || undefined,
        reminder: form.get("reminder") || undefined,
      });
      if (response.ok) {
        const local = demoEvents.filter((item) => {
          const key = itemDateKey(item.startAt);
          return key >= String(form.get("from")) && key <= String(form.get("to"));
        });
        setSearchResult({
          items: [...response.items, ...local],
          unavailableSources: response.unavailableSources,
          truncated: response.truncated,
        });
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-brand">
            <CalendarDays aria-hidden="true" className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-[0.14em] uppercase">{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>
            <Filter aria-hidden="true" className="h-4 w-4" /> {t("searchAndFilter")}
          </Button>
          <Button variant="primary" onClick={() => openCreate()}>
            <Plus aria-hidden="true" className="h-4 w-4" /> {t("newEvent")}
          </Button>
        </div>
      </header>

      {demo && (
        <div className="mb-4 rounded-xl border border-brand/25 bg-brand-subtle px-4 py-2.5 text-sm text-brand-subtle-ink">
          {t("demoNotice")}
        </div>
      )}

      {filtersOpen && (
        <form onSubmit={onSearch} className="dashboard-glow-card mb-4 rounded-xl border border-line bg-surface-raised p-4 shadow-raised">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2"><Label htmlFor="calendar-search">{t("textSearch")}</Label><Input id="calendar-search" name="text" placeholder={t("searchPlaceholder")} /></div>
            <div><Label htmlFor="calendar-from">{t("from")}</Label><Input id="calendar-from" name="from" type="date" defaultValue={days[0].key} dir="ltr" required /></div>
            <div><Label htmlFor="calendar-to">{t("to")}</Label><Input id="calendar-to" name="to" type="date" defaultValue={days[days.length - 1].key} dir="ltr" required /></div>
            <div><Label htmlFor="calendar-reminder">{t("reminders")}</Label><NativeSelect id="calendar-reminder" name="reminder" defaultValue=""><option value="">{t("any")}</option><option value="with">{t("withReminder")}</option><option value="without">{t("withoutReminder")}</option></NativeSelect></div>
          </div>
          <fieldset className="mt-3">
            <legend className="text-xs font-semibold text-ink-muted">{t("sources")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CALENDAR_SOURCES.map((source) => (
                <label key={source} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-xs text-ink-muted hover:border-line-strong">
                  <input type="checkbox" name={`source-${source}`} defaultChecked className="accent-brand" />
                  {t(`sourcesMap.${source}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex justify-end"><Button type="submit" variant="primary" disabled={pending}><Search aria-hidden="true" className="h-4 w-4" /> {pending ? t("searching") : t("search")}</Button></div>
        </form>
      )}

      {searchResult && (
        <section className="mb-4 rounded-xl border border-line bg-surface-raised p-4 shadow-raised" aria-labelledby="calendar-search-results">
          <div className="flex items-center justify-between gap-3"><h2 id="calendar-search-results" className="font-semibold text-ink">{t("searchResults", { count: searchResult.items.length })}</h2><button type="button" onClick={() => setSearchResult(null)} className="text-sm text-brand hover:text-brand-hover">{t("closeResults")}</button></div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {searchResult.items.slice(0, 18).map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(mode, itemDateKey(item.startAt))} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-start hover:border-brand/40 hover:bg-brand-subtle/50">
                <span className={cn("h-8 w-1 shrink-0 rounded-full border-s-4", SOURCE_STYLES[item.source])} />
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{item.title}</span><span className="text-xs text-ink-faint"><bdi dir="ltr">{itemDateKey(item.startAt)}</bdi> · {t(`sourcesMap.${item.source}`)}</span></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-glow-card overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-raised" aria-label={t("title") }>
        <div className="flex flex-col gap-3 border-b border-line bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="iconSm" variant="ghost" aria-label={t("previousMonth")} onClick={() => navigate(mode, moveCalendarMonth(mode, anchor, -1))}><ChevronRight aria-hidden="true" className="h-4 w-4 rtl:hidden" /><ChevronLeft aria-hidden="true" className="hidden h-4 w-4 rtl:block" /></Button>
            <Button size="iconSm" variant="ghost" aria-label={t("nextMonth")} onClick={() => navigate(mode, moveCalendarMonth(mode, anchor, 1))}><ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:hidden" /><ChevronRight aria-hidden="true" className="hidden h-4 w-4 rtl:block" /></Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(mode, today)}>{t("today")}</Button>
            <h2 className="min-w-40 text-lg font-bold text-ink">{primaryMonthLabel}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect aria-label={t("month")} value={month.month} onChange={(event) => onMonthSelection(month.year, Number(event.target.value))} className="w-36">
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{mode === "jalali" ? t(`jalaliMonths.${value}`) : new Intl.DateTimeFormat(locale, { calendar: "gregory", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, value - 1, 1)))}</option>)}
            </NativeSelect>
            <NativeSelect aria-label={t("year")} value={month.year} onChange={(event) => onMonthSelection(Number(event.target.value), month.month)} className="w-28">{years.map((year) => <option key={year} value={year}>{new Intl.NumberFormat(locale, { useGrouping: false }).format(year)}</option>)}</NativeSelect>
            <div className="flex rounded-lg border border-line bg-surface-sunken p-1">
              <button type="button" onClick={() => navigate("jalali", anchor)} className={cn("min-h-8 rounded-md px-3 text-xs font-semibold", mode === "jalali" ? "bg-surface-raised text-brand shadow-raised" : "text-ink-muted")}>{t("jalali")}</button>
              <button type="button" onClick={() => navigate("gregorian", anchor)} className={cn("min-h-8 rounded-md px-3 text-xs font-semibold", mode === "gregorian" ? "bg-surface-raised text-brand shadow-raised" : "text-ink-muted")}>{t("gregorian")}</button>
            </div>
          </div>
        </div>

        {(initialResult.unavailableSources.length > 0 || initialResult.truncated) && (
          <div className="border-b border-warning/25 bg-warning-subtle px-4 py-2 text-xs text-warning">{initialResult.unavailableSources.length ? t("partialSources", { sources: initialResult.unavailableSources.map((source) => t(`sourcesMap.${source}`)).join(", ") }) : t("truncated")}</div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-line bg-surface-sunken text-xs font-semibold text-ink-faint">
              {weekdayKeys.map((key) => <div key={key} className="px-2 py-2.5 text-center">{t(`weekdays.${key}`)}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayItems = itemsByDay.get(day.key) ?? [];
                const isToday = day.key === today;
                return (
                  <div key={day.key} className={cn("group/day min-h-32 border-b border-e border-line p-1.5", !day.inMonth && "bg-surface-sunken/45", (index + 1) % 7 === 0 && "border-e-0")}>
                    <div className="mb-1 flex items-start justify-between gap-1">
                      <button type="button" onClick={() => openCreate(day)} aria-label={t("addOnDate", { date: day.key })} className={cn("flex min-h-9 min-w-9 flex-col items-center justify-center rounded-lg px-1 text-xs outline-none hover:bg-brand-subtle focus-visible:outline-2 focus-visible:outline-focus-ring", isToday ? "bg-brand text-ink-on-brand" : day.inMonth ? "text-ink" : "text-ink-faint")}>
                        <span className="font-bold leading-4">{new Intl.NumberFormat(locale).format(day.primaryDay)}</span>
                        <span className={cn("text-[9px] leading-3", isToday ? "text-ink-on-brand/75" : "text-ink-faint")}>{new Intl.NumberFormat(locale).format(day.alternateDay)}</span>
                      </button>
                      {dayItems.length > 0 && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => (
                        <button key={item.id} type="button" onClick={() => { setEditing(item); setEventOpen(true); }} className={cn("block w-full truncate rounded-md border-s-2 px-1.5 py-1 text-start text-[11px] font-medium outline-none hover:brightness-95 focus-visible:outline-2 focus-visible:outline-focus-ring", SOURCE_STYLES[item.source])} title={item.title}>
                          {item.hasReminder && <Bell aria-hidden="true" className="me-1 inline h-2.5 w-2.5" />}{item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && <div className="px-1 text-[10px] text-ink-faint">{t("more", { count: dayItems.length - 3 })}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-faint">
        {CALENDAR_SOURCES.map((source) => <span key={source} className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-sm border-s-2", SOURCE_STYLES[source])} />{t(`sourcesMap.${source}`)}</span>)}
      </div>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="max-w-2xl">
          {editing && editing.source !== "event" ? (
            <>
              <DialogHeader><DialogTitle>{editing.title}</DialogTitle></DialogHeader>
              <DialogBody className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs"><span className={cn("rounded-full border-s-2 px-2.5 py-1", SOURCE_STYLES[editing.source])}>{t(`sourcesMap.${editing.source}`)}</span>{editing.status && <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-ink-muted">{editing.status}</span>}</div>
                <p className="text-sm text-ink-muted"><bdi dir="ltr">{new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: editing.allDay ? undefined : "short", timeZone: "UTC" }).format(new Date(editing.startAt))}</bdi></p>
              </DialogBody>
              <DialogFooter><DialogClose asChild><Button variant="ghost">{t("close")}</Button></DialogClose><Link href={editing.href} className="inline-flex min-h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-ink-on-brand">{t("openRecord")}</Link></DialogFooter>
            </>
          ) : (
            <EventForm item={editing} pending={pending} onSubmit={onEventSubmit} onDelete={editing?.sourceId ? onDelete : undefined} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventForm({
  item,
  pending,
  onSubmit,
  onDelete,
}: {
  item: CalendarItemDTO | null;
  pending: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("calendar");
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const date = item?.startAt.slice(0, 10) ?? dateKey(new Date());
  const start = item?.startAt.slice(11, 16) ?? "09:00";
  const end = item?.endAt.slice(11, 16) ?? "10:00";
  return (
    <form onSubmit={onSubmit}>
      <DialogHeader><DialogTitle>{item?.sourceId ? t("editEvent") : t("newEvent")}</DialogTitle></DialogHeader>
      <DialogBody className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Label htmlFor="event-title" required>{t("eventTitle")}</Label><Input id="event-title" name="title" defaultValue={item?.title} maxLength={200} required autoFocus /></div>
        <div><Label htmlFor="event-type">{t("eventType")}</Label><NativeSelect id="event-type" name="type" defaultValue={item?.type ?? "appointment"}><option value="appointment">{t("types.appointment")}</option><option value="meeting">{t("types.meeting")}</option><option value="deadline">{t("types.deadline")}</option><option value="followup">{t("types.followup")}</option></NativeSelect></div>
        <div><Label htmlFor="event-tone">{t("color")}</Label><NativeSelect id="event-tone" name="tone" defaultValue={item?.tone ?? "brand"}><option value="brand">{t("tones.brand")}</option><option value="accent">{t("tones.accent")}</option><option value="info">{t("tones.info")}</option><option value="positive">{t("tones.positive")}</option><option value="warning">{t("tones.warning")}</option><option value="danger">{t("tones.danger")}</option></NativeSelect></div>
        <div><Label htmlFor="event-date" required>{t("date")}</Label><Input id="event-date" name="date" type="date" defaultValue={date} dir="ltr" required /></div>
        <label className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm text-ink-muted"><input type="checkbox" name="allDay" defaultChecked={item?.allDay} className="accent-brand" />{t("allDay")}</label>
        <div><Label htmlFor="event-start">{t("start")}</Label><Input id="event-start" name="start" type="time" defaultValue={start} dir="ltr" required /></div>
        <div><Label htmlFor="event-end">{t("end")}</Label><Input id="event-end" name="end" type="time" defaultValue={end} dir="ltr" required /></div>
        <div className="sm:col-span-2"><Label htmlFor="event-location">{t("location")}</Label><div className="relative"><MapPin aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" /><Input id="event-location" name="location" defaultValue={item?.location ?? ""} className="ps-9" maxLength={300} /></div></div>
        <div className="sm:col-span-2"><Label htmlFor="event-description">{t("eventDescription")}</Label><textarea id="event-description" name="description" defaultValue={item?.description ?? ""} rows={3} maxLength={4000} className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" /></div>
        <fieldset className="sm:col-span-2"><legend className="text-xs font-semibold text-ink-muted">{t("reminders")}</legend><div className="mt-2 flex flex-wrap gap-2">{REMINDER_OPTIONS.map((offset) => <label key={offset} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-xs text-ink-muted"><input type="checkbox" name={`reminder-${offset}`} defaultChecked={item?.reminderOffsets?.includes(offset)} className="accent-brand" />{t(`reminderOptions.${offset}`)}</label>)}</div></fieldset>
        <input type="hidden" name="customFields" value={JSON.stringify(customFields)} />
        <div className="sm:col-span-2"><BusinessCustomFields entityKey="event" onChange={setCustomFields} /></div>
      </DialogBody>
      <DialogFooter className="justify-between sm:justify-between">
        <div>{onDelete && <Button type="button" variant="ghost" onClick={onDelete} disabled={pending} className="text-danger hover:text-danger"><Trash2 aria-hidden="true" className="h-4 w-4" />{t("deleteEvent")}</Button>}</div>
        <div className="flex gap-2"><DialogClose asChild><Button type="button" variant="ghost">{t("cancel")}</Button></DialogClose><Button type="submit" variant="primary" disabled={pending}><Pencil aria-hidden="true" className="h-4 w-4" />{pending ? t("saving") : t("saveEvent")}</Button></div>
      </DialogFooter>
    </form>
  );
}

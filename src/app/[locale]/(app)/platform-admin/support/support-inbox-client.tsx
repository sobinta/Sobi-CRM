"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Clock3, Headphones, Radio, Send, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/patterns/page-header";
import { cn } from "@/lib/utils";
import { assignOperatorTicketAction, loadOperatorTicketAction, loadOperatorTicketsAction, replyOperatorTicketAction, statusOperatorTicketAction } from "./actions";

type Summary = { id: string; tenantId: string; tenantName: string; requesterName: string; subject: string; priority: string; status: string; channel: string; assignedToUserId: string | null; lastMessageAt: string; lastMessage: string; messageCount: number; unread: boolean };
type Detail = Omit<Summary, "lastMessage" | "messageCount" | "unread"> & { requesterEmail: string; category: string; createdAt: string; messages: { id: string; senderKind: string; body: string; createdAt: string }[] };
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"] as const;

export function SupportInboxClient({ initialTickets }: { initialTickets: Summary[] }) {
  const t = useTranslations("supportAdmin");
  const ts = useTranslations("support");
  const locale = useLocale();
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("all");
  const [tenantId, setTenantId] = useState("");
  const [minAgeHours, setMinAgeHours] = useState("");
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = useCallback((id: string) => {
    setSelected(id);
    startTransition(async () => {
      const result = await loadOperatorTicketAction(id);
      if (result.ok) setDetail(result.ticket);
    });
  }, []);
  useEffect(() => {
    if (!selected || detail?.channel !== "LIVE_CHAT") return;
    const source = new EventSource(`/api/platform-admin/support/live/${selected}`);
    const refresh = () => open(selected);
    source.addEventListener("message", refresh);
    source.addEventListener("ticket", refresh);
    return () => source.close();
  }, [selected, detail?.channel, open]);

  const filters = () => ({ status: status || undefined, priority: priority || undefined, assignee, tenantId: tenantId || undefined, minAgeHours: minAgeHours ? Number(minAgeHours) : undefined, take: 50 });
  async function reload() {
    const result = await loadOperatorTicketsAction(filters());
    if (result.ok) setTickets(result.tickets);
    if (selected) { const current = await loadOperatorTicketAction(selected); if (current.ok) setDetail(current.ticket); }
  }
  function filter() { startTransition(async () => { const result = await loadOperatorTicketsAction(filters()); if (result.ok) { setTickets(result.tickets); setDetail(null); setSelected(null); } }); }
  function updateStatus(next: typeof statuses[number]) { if (!detail) return; startTransition(async () => { const result = await statusOperatorTicketAction(detail.id, next); setNotice(result.ok ? t("statusUpdated") : t("updateFailed")); if (result.ok) await reload(); }); }
  function assign(self: boolean) { if (!detail) return; startTransition(async () => { const result = await assignOperatorTicketAction(detail.id, self); setNotice(result.ok ? (self ? t("assigned") : t("unassigned")) : t("assignFailed")); if (result.ok) await reload(); }); }
  function send() { if (!detail || !reply.trim()) return; const text = reply.trim(); setReply(""); startTransition(async () => { const result = await replyOperatorTicketAction({ ticketId: detail.id, body: text, clientMessageId: crypto.randomUUID().replaceAll("-", "_") }); if (!result.ok) { setReply(text); setNotice(t("sendFailed")); return; } setNotice(t("replySent")); await reload(); }); }

  return <div className="min-h-full">
    <PageHeader title={t("title")} description={t("description")} />
    <div className="border-b border-line bg-surface px-6 py-3"><div className="flex flex-wrap items-center gap-2">
      <NativeSelect aria-label={t("statusFilter")} className="w-48" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("allStatuses")}</option>{statuses.map((value) => <option key={value} value={value}>{ts(`status_${value.toLowerCase()}`)}</option>)}</NativeSelect>
      <NativeSelect aria-label={t("priorityFilter")} className="w-40" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">{t("allPriorities")}</option>{["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => <option key={value} value={value}>{t(`priority_${value.toLowerCase()}`)}</option>)}</NativeSelect>
      <NativeSelect aria-label={t("assigneeFilter")} className="w-40" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">{t("allAssignees")}</option><option value="mine">{t("assignedToMe")}</option><option value="unassigned">{t("withoutAssignee")}</option></NativeSelect>
      <NativeSelect aria-label={t("tenantFilter")} className="w-44" value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">{t("allTenants")}</option>{Array.from(new Map(initialTickets.map((ticket) => [ticket.tenantId, ticket.tenantName]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect>
      <NativeSelect aria-label={t("ageFilter")} className="w-44" value={minAgeHours} onChange={(event) => setMinAgeHours(event.target.value)}><option value="">{t("anyAge")}</option><option value="4">{t("older4")}</option><option value="12">{t("older12")}</option><option value="24">{t("older24")}</option><option value="72">{t("older72")}</option></NativeSelect>
      <Button onClick={filter} disabled={pending}>{t("applyFilters")}</Button>
    </div></div>
    <div className="grid min-h-[calc(100dvh-210px)] lg:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="border-e border-line bg-surface-raised"><div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{t("queue")} · {tickets.length}</div><div className="max-h-[calc(100dvh-260px)] overflow-y-auto p-2">
        {tickets.map((ticket) => <button key={ticket.id} onClick={() => open(ticket.id)} className={cn("mb-1 w-full rounded-xl border p-3 text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring", selected === ticket.id ? "border-brand/45 bg-brand-subtle/55" : "border-transparent hover:border-line hover:bg-surface-sunken")}><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className={cn("h-2 w-2 shrink-0 rounded-full", ticket.unread ? "bg-brand" : "bg-line-strong")} /><span className="line-clamp-1 text-sm font-semibold text-ink">{ticket.subject}</span></span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", ticket.priority === "URGENT" ? "bg-danger/10 text-danger" : "bg-surface-sunken text-ink-muted")}>{t(`priority_${ticket.priority.toLowerCase()}`)}</span></div><p className="mt-1 line-clamp-1 text-xs text-ink-muted">{ticket.lastMessage}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint"><Building2 aria-hidden="true" className="h-3 w-3" />{ticket.tenantName}<span>·</span><Clock3 aria-hidden="true" className="h-3 w-3" />{new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(ticket.lastMessageAt))}</div></button>)}
      </div></aside>
      <main className="flex min-w-0 flex-col bg-surface-sunken/25">{detail ? <>
        <div className="border-b border-line bg-surface-raised p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-ink text-pretty">{detail.subject}</h2>{detail.channel === "LIVE_CHAT" && <Radio aria-hidden="true" className="h-4 w-4 text-positive" />}</div><p className="mt-1 break-words text-sm text-ink-muted">{detail.requesterName} · {detail.requesterEmail} · {detail.tenantName}</p></div><div className="flex flex-wrap gap-2"><Button variant="subtle" onClick={() => assign(!detail.assignedToUserId)}><UserRoundCheck aria-hidden="true" className="h-4 w-4" />{detail.assignedToUserId ? t("removeAssignment") : t("assignToMe")}</Button><NativeSelect aria-label={t("changeStatus")} className="w-52" value={detail.status} onChange={(event) => updateStatus(event.target.value as typeof statuses[number])}>{statuses.map((value) => <option key={value} value={value}>{ts(`status_${value.toLowerCase()}`)}</option>)}</NativeSelect></div></div></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">{detail.messages.map((message) => <div key={message.id} className={cn("flex", message.senderKind === "OPERATOR" ? "justify-end" : "justify-start")}><div className={cn("max-w-[78%] break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm", message.senderKind === "OPERATOR" ? "rounded-ee-sm bg-brand text-ink-on-brand" : "rounded-es-sm border border-line bg-surface-raised text-ink")}><div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold opacity-70">{message.senderKind === "OPERATOR" ? <ShieldCheck aria-hidden="true" className="h-3 w-3" /> : <Headphones aria-hidden="true" className="h-3 w-3" />}{message.senderKind === "OPERATOR" ? t("operator") : t("customer")}</div><p className="whitespace-pre-wrap">{message.body}</p></div></div>)}</div>
        <div className="border-t border-line bg-surface-raised p-4"><div className="flex items-end gap-2"><Textarea name="operator-support-reply" autoComplete="off" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} className="min-h-12 flex-1" placeholder={t("replyPlaceholder")} /><Button variant="primary" size="icon" onClick={send} disabled={pending || !reply.trim()} aria-label={t("sendReply")}><Send aria-hidden="true" className="h-4 w-4" /></Button></div>{notice && <p className="mt-2 text-xs text-ink-muted" role="status">{notice}</p>}</div>
      </> : <div className="flex flex-1 flex-col items-center justify-center text-center"><Headphones aria-hidden="true" className="mb-3 h-10 w-10 text-brand" /><h2 className="font-semibold text-ink">{t("selectRequest")}</h2></div>}</main>
    </div>
  </div>;
}

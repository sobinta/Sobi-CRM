"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
  const [tickets, setTickets] = useState(initialTickets);
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
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
  useEffect(() => { if (selected && !detail) open(selected); }, [selected, detail, open]);
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
  function filter() { startTransition(async () => { const result = await loadOperatorTicketsAction(filters()); if (result.ok) { setTickets(result.tickets); setDetail(null); setSelected(result.tickets[0]?.id ?? null); } }); }
  function updateStatus(next: typeof statuses[number]) { if (!detail) return; startTransition(async () => { const result = await statusOperatorTicketAction(detail.id, next); setNotice(result.ok ? "وضعیت تیکت به‌روزرسانی شد." : "به‌روزرسانی انجام نشد."); if (result.ok) await reload(); }); }
  function assign(self: boolean) { if (!detail) return; startTransition(async () => { const result = await assignOperatorTicketAction(detail.id, self); setNotice(result.ok ? (self ? "تیکت به شما واگذار شد." : "واگذاری برداشته شد.") : "واگذاری انجام نشد."); if (result.ok) await reload(); }); }
  function send() { if (!detail || !reply.trim()) return; const text = reply.trim(); setReply(""); startTransition(async () => { const result = await replyOperatorTicketAction({ ticketId: detail.id, body: text, clientMessageId: crypto.randomUUID().replaceAll("-", "_") }); if (!result.ok) { setReply(text); setNotice("ارسال انجام نشد؛ متن پاسخ حفظ شد."); return; } setNotice("پاسخ ارسال و اعلان امن برای مشتری ثبت شد."); await reload(); }); }

  return <div className="min-h-full">
    <PageHeader title="صندوق پشتیبانی پلتفرم" description="مدیریت امن تیکت‌ها و چت‌های زنده همه فضاهای کاری Sobinta" />
    <div className="border-b border-line bg-surface px-6 py-3"><div className="flex flex-wrap items-center gap-2">
      <NativeSelect aria-label="فیلتر وضعیت" className="w-48" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">همه وضعیت‌ها</option>{statuses.map((value) => <option key={value}>{value}</option>)}</NativeSelect>
      <NativeSelect aria-label="فیلتر اولویت" className="w-40" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">همه اولویت‌ها</option>{["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</NativeSelect>
      <NativeSelect aria-label="فیلتر مسئول" className="w-40" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="all">همه مسئول‌ها</option><option value="mine">واگذارشده به من</option><option value="unassigned">بدون مسئول</option></NativeSelect>
      <NativeSelect aria-label="فیلتر فضای کاری" className="w-44" value={tenantId} onChange={(event) => setTenantId(event.target.value)}><option value="">همه فضاها</option>{Array.from(new Map(initialTickets.map((ticket) => [ticket.tenantId, ticket.tenantName]))).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect>
      <NativeSelect aria-label="حداقل زمان انتظار" className="w-44" value={minAgeHours} onChange={(event) => setMinAgeHours(event.target.value)}><option value="">هر زمان انتظار</option><option value="4">بیش از ۴ ساعت</option><option value="12">بیش از ۱۲ ساعت</option><option value="24">بیش از ۲۴ ساعت</option><option value="72">بیش از ۳ روز</option></NativeSelect>
      <Button onClick={filter} disabled={pending}>اعمال فیلتر</Button>
    </div></div>
    <div className="grid min-h-[calc(100dvh-210px)] lg:grid-cols-[390px_minmax(0,1fr)]">
      <aside className="border-e border-line bg-surface-raised"><div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">صف درخواست‌ها · {tickets.length}</div><div className="max-h-[calc(100dvh-260px)] overflow-y-auto p-2">
        {tickets.map((ticket) => <button key={ticket.id} onClick={() => open(ticket.id)} className={cn("mb-1 w-full rounded-xl border p-3 text-start", selected === ticket.id ? "border-brand/45 bg-brand-subtle/55" : "border-transparent hover:border-line hover:bg-surface-sunken")}><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className={cn("h-2 w-2 shrink-0 rounded-full", ticket.unread ? "bg-brand" : "bg-line-strong")} /><span className="line-clamp-1 text-sm font-semibold text-ink">{ticket.subject}</span></span><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", ticket.priority === "URGENT" ? "bg-danger/10 text-danger" : "bg-surface-sunken text-ink-muted")}>{ticket.priority}</span></div><p className="mt-1 line-clamp-1 text-xs text-ink-muted">{ticket.lastMessage}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint"><Building2 className="h-3 w-3" />{ticket.tenantName}<span>·</span><Clock3 className="h-3 w-3" />{new Intl.RelativeTimeFormat("fa", { numeric: "auto" }).format(-Math.max(0, Math.round((Date.now() - new Date(ticket.lastMessageAt).getTime()) / 3_600_000)), "hour")}</div></button>)}
      </div></aside>
      <main className="flex min-w-0 flex-col bg-surface-sunken/25">{detail ? <>
        <div className="border-b border-line bg-surface-raised p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-ink">{detail.subject}</h2>{detail.channel === "LIVE_CHAT" && <Radio className="h-4 w-4 text-positive" />}</div><p className="mt-1 text-sm text-ink-muted">{detail.requesterName} · {detail.requesterEmail} · {detail.tenantName}</p></div><div className="flex flex-wrap gap-2"><Button variant="subtle" onClick={() => assign(!detail.assignedToUserId)}><UserRoundCheck className="h-4 w-4" />{detail.assignedToUserId ? "برداشتن واگذاری" : "واگذاری به من"}</Button><NativeSelect aria-label="تغییر وضعیت" className="w-52" value={detail.status} onChange={(event) => updateStatus(event.target.value as typeof statuses[number])}>{statuses.map((value) => <option key={value}>{value}</option>)}</NativeSelect></div></div></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">{detail.messages.map((message) => <div key={message.id} className={cn("flex", message.senderKind === "OPERATOR" ? "justify-end" : "justify-start")}><div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm", message.senderKind === "OPERATOR" ? "rounded-ee-sm bg-brand text-ink-on-brand" : "rounded-es-sm border border-line bg-surface-raised text-ink")}><div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold opacity-70">{message.senderKind === "OPERATOR" ? <ShieldCheck className="h-3 w-3" /> : <Headphones className="h-3 w-3" />}{message.senderKind}</div><p className="whitespace-pre-wrap">{message.body}</p></div></div>)}</div>
        <div className="border-t border-line bg-surface-raised p-4"><div className="flex items-end gap-2"><Textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} className="min-h-12 flex-1" placeholder="پاسخ اپراتور…" /><Button variant="primary" size="icon" onClick={send} disabled={pending || !reply.trim()} aria-label="ارسال پاسخ"><Send className="h-4 w-4" /></Button></div>{notice && <p className="mt-2 text-xs text-ink-muted" role="status">{notice}</p>}</div>
      </> : <div className="flex flex-1 flex-col items-center justify-center text-center"><Headphones className="mb-3 h-10 w-10 text-brand" /><h2 className="font-semibold text-ink">یک درخواست را انتخاب کنید</h2></div>}</main>
    </div>
  </div>;
}

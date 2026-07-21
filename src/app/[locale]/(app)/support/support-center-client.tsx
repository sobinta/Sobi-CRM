"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Headphones, LockKeyhole, MessageCircleMore, Plus, Radio, Send, Sparkles, TicketCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/patterns/page-header";
import { cn } from "@/lib/utils";
import {
  createSupportTicketAction,
  loadSupportTicketAction,
  loadSupportTicketsAction,
  replySupportTicketAction,
} from "./actions";

type TicketSummary = {
  id: string; subject: string; category: string; priority: string; status: string;
  channel: string; lastMessageAt: string; requesterLastReadAt: string | null;
  messageCount: number; lastMessage: string;
};
type Message = { id: string; senderKind: string; body: string; createdAt: string };
type TicketDetail = Omit<TicketSummary, "messageCount" | "lastMessage"> & { messages: Message[] };

const demoTickets: TicketSummary[] = [{
  id: "demo-support-welcome", subject: "راهنمای شروع کار با Sobi CRM", category: "general",
  priority: "NORMAL", status: "WAITING_ON_CUSTOMER", channel: "LIVE_CHAT",
  lastMessageAt: new Date().toISOString(), requesterLastReadAt: null, messageCount: 2,
  lastMessage: "سلام! تیم Sobinta آماده پاسخ‌گویی است.",
}];
const demoMessages: Message[] = [
  { id: "demo-1", senderKind: "CUSTOMER", body: "برای شروع تنظیم داشبورد به راهنمایی نیاز دارم.", createdAt: new Date(Date.now() - 180_000).toISOString() },
  { id: "demo-2", senderKind: "OPERATOR", body: "سلام! خوش آمدید. از بخش فرم‌ساز و تقویم شروع می‌کنیم؛ هر سؤال دیگری هم همین‌جا بپرسید.", createdAt: new Date(Date.now() - 120_000).toISOString() },
];

export function SupportCenterClient({ initialTickets, liveAvailable, demo }: { initialTickets: TicketSummary[]; liveAvailable: boolean; demo: boolean }) {
  const t = useTranslations("support");
  const [tickets, setTickets] = useState<TicketSummary[]>(demo && initialTickets.length === 0 ? demoTickets : initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(demo ? (tickets[0]?.id ?? null) : null);
  const [detail, setDetail] = useState<TicketDetail | null>(demo && tickets[0] ? { ...demoTickets[0], messages: demoMessages } : null);
  const [mode, setMode] = useState<"TICKET" | "LIVE_CHAT">("TICKET");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [category, setCategory] = useState("general");
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshList = useCallback(async () => {
    if (demo) return;
    setTickets(await loadSupportTicketsAction());
  }, [demo]);

  const openTicket = useCallback((id: string) => {
    setSelectedId(id);
    if (demo) {
      const summary = tickets.find((ticket) => ticket.id === id);
      if (summary) setDetail({ ...summary, messages: id === "demo-support-welcome" ? demoMessages : [] });
      return;
    }
    startTransition(async () => {
      const result = await loadSupportTicketAction(id);
      if (result.ok) setDetail(result.ticket);
    });
  }, [demo, tickets]);

  useEffect(() => {
    if (demo || detail?.channel !== "LIVE_CHAT" || !selectedId) return;
    const source = new EventSource(`/api/support/live/${selectedId}`);
    let failures = 0;
    let pollTimer: number | null = null;
    const startPolling = () => {
      if (pollTimer !== null) return;
      source.close();
      pollTimer = window.setInterval(() => openTicket(selectedId), 5_000);
    };
    source.addEventListener("message", () => openTicket(selectedId));
    source.addEventListener("ticket", () => openTicket(selectedId));
    source.addEventListener("ready", () => { failures = 0; });
    source.addEventListener("fallback", startPolling);
    source.onerror = () => {
      failures += 1;
      if (failures >= 3) startPolling();
    };
    return () => { source.close(); if (pollTimer !== null) window.clearInterval(pollTimer); };
  }, [demo, detail?.channel, selectedId, openTicket]);

  const unread = useMemo(() => tickets.filter((ticket) => !ticket.requesterLastReadAt || ticket.lastMessageAt > ticket.requesterLastReadAt).length, [tickets]);
  const statusLabel = (value: string) => t(`status_${value.toLowerCase()}`);

  function submitNew() {
    if (subject.trim().length < 3 || !body.trim()) return;
    setNotice(null);
    startTransition(async () => {
      if (demo) {
        const now = new Date().toISOString();
        const id = `demo-${Date.now()}`;
        const next: TicketSummary = { id, subject: subject.trim(), category, priority: "NORMAL", status: "OPEN", channel: mode, lastMessageAt: now, requesterLastReadAt: now, messageCount: 1, lastMessage: body.trim() };
        setTickets((current) => [next, ...current]);
        setDetail({ ...next, messages: [{ id: `${id}-1`, senderKind: "CUSTOMER", body: body.trim(), createdAt: now }] });
        setSelectedId(id);
        setNotice(t("demoSaved"));
      } else {
        const result = await createSupportTicketAction({ subject, body, category, channel: mode, clientMessageId: crypto.randomUUID().replaceAll("-", "_") });
        if (!result.ok) return setNotice(t("failed"));
        await refreshList();
        openTicket(result.id);
      }
      setSubject(""); setBody(""); setCreating(false);
    });
  }

  function submitReply() {
    if (!detail || !reply.trim()) return;
    const text = reply.trim();
    setReply("");
    startTransition(async () => {
      if (demo) {
        const message = { id: `demo-message-${Date.now()}`, senderKind: "CUSTOMER", body: text, createdAt: new Date().toISOString() };
        setDetail((current) => current ? { ...current, messages: [...current.messages, message] } : current);
        setNotice(t("demoSaved"));
        return;
      }
      const clientMessageId = crypto.randomUUID().replaceAll("-", "_");
      const result = detail.channel === "LIVE_CHAT"
        ? await fetch(`/api/support/live/${detail.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: text, clientMessageId }) }).then((response) => response.ok ? { ok: true } : { ok: false })
        : await replySupportTicketAction({ ticketId: detail.id, body: text, clientMessageId });
      if (!result.ok) { setReply(text); setNotice(t("failed")); return; }
      await openTicket(detail.id);
      await refreshList();
    });
  }

  return <div className="min-h-full">
    <PageHeader title={t("title")} description={t("description")} actions={<Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />{t("newTicket")}</Button>} />
    <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:p-6">
      <aside className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-raised">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><div className="flex items-center gap-2 font-semibold text-ink"><TicketCheck className="h-4 w-4 text-brand" />{t("myTickets")}</div>{unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-ink-on-brand">{unread}</span>}</div>
        <div className="max-h-[calc(100dvh-230px)] space-y-1 overflow-y-auto p-2">
          {tickets.length === 0 && <div className="px-5 py-12 text-center text-sm text-ink-muted"><Headphones className="mx-auto mb-3 h-8 w-8 text-brand" />{t("empty")}</div>}
          {tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => openTicket(ticket.id)} className={cn("w-full rounded-xl border p-3 text-start outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring", selectedId === ticket.id ? "border-brand/45 bg-brand-subtle/55" : "border-transparent hover:border-line hover:bg-surface-sunken/60")}>
            <div className="flex items-start justify-between gap-2"><span className="line-clamp-1 text-sm font-semibold text-ink">{ticket.subject}</span><span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? "bg-positive" : "bg-brand")} /></div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{ticket.lastMessage}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-faint">{ticket.channel === "LIVE_CHAT" ? <Radio className="h-3 w-3" /> : <MessageCircleMore className="h-3 w-3" />}<span>{t(ticket.channel === "LIVE_CHAT" ? "live" : "ticket")}</span><span>·</span><span>{ticket.messageCount} {t("messages")}</span></div>
          </button>)}
        </div>
      </aside>

      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-raised">
        {creating ? <div className="flex flex-1 flex-col">
          <div className="border-b border-line p-5"><h2 className="text-lg font-semibold text-ink">{t("newRequest")}</h2><p className="mt-1 text-sm text-ink-muted">{t("newRequestHint")}</p></div>
          <div className="mx-auto w-full max-w-2xl space-y-5 p-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-sunken p-1.5"><button type="button" onClick={() => setMode("TICKET")} className={cn("rounded-lg px-3 py-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-focus-ring", mode === "TICKET" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted")}><MessageCircleMore aria-hidden="true" className="me-2 inline h-4 w-4" />{t("ticket")}</button><button type="button" disabled={!liveAvailable} onClick={() => setMode("LIVE_CHAT")} className={cn("rounded-lg px-3 py-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-focus-ring", mode === "LIVE_CHAT" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted", !liveAvailable && "cursor-not-allowed opacity-60")}><Radio aria-hidden="true" className="me-2 inline h-4 w-4" />{t("live")}{!liveAvailable && <LockKeyhole aria-hidden="true" className="ms-2 inline h-3.5 w-3.5" />}</button></div>
            {!liveAvailable && <div className="flex gap-3 rounded-xl border border-brand/20 bg-brand-subtle/45 p-4 text-sm text-brand-subtle-ink"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><span>{t("liveUpgrade")}</span></div>}
            <label className="block space-y-1.5 text-sm font-medium text-ink">{t("subject")}<Input name="support-subject" autoComplete="off" value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm font-medium text-ink">{t("category")}<NativeSelect name="support-category" autoComplete="off" value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">{t("general")}</option><option value="technical">{t("technical")}</option><option value="billing">{t("billing")}</option><option value="feature">{t("feature")}</option></NativeSelect></label>
            <label className="block space-y-1.5 text-sm font-medium text-ink">{t("message")}<Textarea name="support-message" autoComplete="off" className="min-h-36" value={body} maxLength={4000} onChange={(event) => setBody(event.target.value)} /></label>
            <div className="flex justify-end gap-2"><Button onClick={() => setCreating(false)}>{t("cancel")}</Button><Button variant="primary" disabled={isPending || subject.trim().length < 3 || !body.trim()} onClick={submitNew}>{mode === "LIVE_CHAT" ? t("startChat") : t("sendTicket")}</Button></div>
          </div>
        </div> : detail ? <>
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-ink text-pretty">{detail.subject}</h2><span className="rounded-full bg-brand-subtle px-2 py-0.5 text-[11px] font-semibold text-brand-subtle-ink">{t(detail.channel === "LIVE_CHAT" ? "live" : "ticket")}</span></div><p className="mt-1 text-xs text-ink-muted">{t("status")}: {statusLabel(detail.status)}</p></div>{detail.channel === "LIVE_CHAT" && <span className="flex items-center gap-1.5 text-xs font-medium text-positive"><span className="h-2 w-2 animate-pulse rounded-full bg-positive motion-reduce:animate-none" />{t("connected")}</span>}</div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-surface-sunken/30 p-5">{detail.messages.map((message) => <div key={message.id} className={cn("flex", message.senderKind === "CUSTOMER" ? "justify-end" : "justify-start")}><div className={cn("max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm", message.senderKind === "CUSTOMER" ? "rounded-ee-sm bg-brand text-ink-on-brand" : "rounded-es-sm border border-line bg-surface-raised text-ink")}><p className="whitespace-pre-wrap">{message.body}</p><time className={cn("mt-1 block text-[10px]", message.senderKind === "CUSTOMER" ? "text-ink-on-brand/70" : "text-ink-faint")}>{new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</time></div></div>)}</div>
          <div className="border-t border-line bg-surface-raised p-4"><div className="flex items-end gap-2"><Textarea name="support-reply" autoComplete="off" value={reply} maxLength={4000} disabled={detail.status === "CLOSED"} onChange={(event) => setReply(event.target.value)} placeholder={t("replyPlaceholder")} className="min-h-11 flex-1 resize-none" /><Button variant="primary" size="icon" aria-label={t("send")} disabled={isPending || !reply.trim() || detail.status === "CLOSED"} onClick={submitReply}><Send aria-hidden="true" className="h-4 w-4" /></Button></div>{notice && <p role="status" className="mt-2 text-xs text-ink-muted">{notice}</p>}</div>
        </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Headphones className="mb-4 h-10 w-10 text-brand" /><h2 className="font-semibold text-ink">{t("selectTitle")}</h2><p className="mt-1 max-w-sm text-sm text-ink-muted">{t("selectHint")}</p></div>}
      </section>
    </div>
  </div>;
}

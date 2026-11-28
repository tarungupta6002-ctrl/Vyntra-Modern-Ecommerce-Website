'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, LifeBuoy, RotateCcw, Search, Send } from 'lucide-react';
import { PageHeader, StatRow, consoleButton } from '@/components/console/console-ui';

type TicketStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED';

interface Ticket {
  id: string;
  ticketNumber: string;
  topicLabel: string;
  subject: string;
  status: TicketStatus;
  statusLabel: string;
  orderNumber: string | null;
  createdAt: string;
  lastMessageAt: string;
  customer?: { name: string; email: string };
  messageCount?: number;
  messages?: { id: string; fromStaff: boolean; authorName: string; body: string; createdAt: string }[];
}

const TABS: { key: TicketStatus | 'ALL'; label: string }[] = [
  { key: 'OPEN', label: 'Needs reply' },
  { key: 'ANSWERED', label: 'Waiting on customer' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'ALL', label: 'All' },
];

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-800 border-amber-200',
  ANSWERED: 'bg-sky-50 text-sky-800 border-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

const ADMIN_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Needs reply',
  ANSWERED: 'Waiting on customer',
  RESOLVED: 'Resolved',
};

function when(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function waitingFor(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return 'under 1h';
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json.data;
}

function AdminSupportInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get('ticket');

  const [tab, setTab] = useState<TicketStatus | 'ALL'>('OPEN');
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState<Record<TicketStatus, number>>({ OPEN: 0, ANSWERED: 0, RESOLVED: 0 });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<null | 'reply' | 'resolve' | 'status'>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams({ status: tab });
      if (query.trim()) params.set('q', query.trim());
      const data = await readJson(await fetch(`/api/admin/support?${params}`, { cache: 'no-store' }));
      setTickets(data.tickets);
      setCounts(data.counts);
    } catch (e: any) {
      setListError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    const t = setTimeout(loadList, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadList, query]);

  useEffect(() => {
    if (!selected) {
      setTicket(null);
      return;
    }
    let cancelled = false;
    setTicketLoading(true);
    setActionError(null);
    fetch(`/api/admin/support/${encodeURIComponent(selected)}`, { cache: 'no-store' })
      .then(readJson)
      .then((d) => !cancelled && setTicket(d.ticket))
      .catch((e) => !cancelled && setActionError(e.message))
      .finally(() => !cancelled && setTicketLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const select = (ticketNumber: string) => {
    setReply('');
    router.push(`${pathname}?ticket=${encodeURIComponent(ticketNumber)}`, { scroll: false });
  };

  const act = async (payload: Record<string, unknown>, kind: 'reply' | 'resolve' | 'status') => {
    if (!ticket) return;
    setBusy(kind);
    setActionError(null);
    try {
      const data = await readJson(
        await fetch(`/api/admin/support/${encodeURIComponent(ticket.ticketNumber)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );
      setTicket(data.ticket);
      if (payload.message) setReply('');
      loadList();
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const sendReply = (resolve: boolean) => {
    if (reply.trim().length < 10) {
      setActionError('Write at least 10 characters.');
      return;
    }
    act({ message: reply, resolve }, resolve ? 'resolve' : 'reply');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer support"
        description={<>Replies appear in the customer&apos;s account, signed &ldquo;Vyntra Customer Service&rdquo;, and are emailed to them.</>}
        actions={
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search tickets</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ticket, order, customer or subject"
            className="w-full rounded-lg border border-[#D5D9D9] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
          />
        </label>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => {
          const count = t.key === 'ALL' ? counts.OPEN + counts.ANSWERED + counts.RESOLVED : counts[t.key];
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                tab === t.key ? 'border-[#0F1111] bg-[#0F1111] text-white' : 'border-[#D5D9D9] bg-white text-[#0F1111] hover:border-[#007185]'
              }`}
            >
              {t.label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Queue */}
        <section className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white" aria-label="Tickets">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-[#565959]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : listError ? (
            <p className="p-4 text-sm text-[#B12704]">{listError}</p>
          ) : tickets.length === 0 ? (
            <p className="p-4 text-sm text-[#565959]">{tab === 'OPEN' ? 'Nothing waiting for a reply.' : 'No tickets here.'}</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-[#E3E6E6] overflow-y-auto">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => select(t.ticketNumber)}
                    className={`w-full px-4 py-3 text-left hover:bg-[#F7F8F8] ${selected === t.ticketNumber ? 'bg-[#EAF4F5]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-semibold text-[#0F1111]">{t.subject}</span>
                      {t.status === 'OPEN' ? (
                        <span className="shrink-0 text-xs font-semibold text-amber-700">{waitingFor(t.lastMessageAt)}</span>
                      ) : (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[t.status]}`}>
                          {ADMIN_STATUS_LABEL[t.status]}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-[#565959]">
                      {t.customer?.name} · {t.topicLabel}
                      {t.orderNumber ? ` · ${t.orderNumber}` : ''}
                    </div>
                    <div className="text-[11px] text-[#8A8F8F]">{t.ticketNumber}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Conversation */}
        <section className="rounded-xl border border-[#D5D9D9] bg-white" aria-label="Conversation">
          {!selected ? (
            <p className="p-6 text-sm text-[#565959]">Choose a ticket to read and reply.</p>
          ) : ticketLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-[#565959]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading ticket…
            </div>
          ) : !ticket ? (
            <p className="p-6 text-sm text-[#B12704]">{actionError || 'Ticket not found.'}</p>
          ) : (
            <>
              <header className="border-b border-[#E3E6E6] px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[ticket.status]}`}>
                    {ADMIN_STATUS_LABEL[ticket.status]}
                  </span>
                  <span className="text-xs text-[#565959]">
                    {ticket.ticketNumber} · {ticket.topicLabel} · opened {when(ticket.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-[#0F1111]">{ticket.subject}</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-[#0F1111]">
                    {ticket.customer?.name}{' '}
                    <a href={`mailto:${ticket.customer?.email}`} className="text-[#007185] hover:underline">
                      {ticket.customer?.email}
                    </a>
                  </span>
                  {ticket.orderNumber && (
                    <Link href={`/admin/orders/${encodeURIComponent(ticket.orderNumber)}`} className="font-semibold text-[#007185] hover:underline">
                      Order {ticket.orderNumber}
                    </Link>
                  )}
                </div>
              </header>

              <ol className="max-h-[50vh] space-y-4 overflow-y-auto px-5 py-5">
                {(ticket.messages || []).map((m) => (
                  <li key={m.id} className={`flex ${m.fromStaff ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.fromStaff ? 'rounded-tr-sm bg-[#E6F2F3]' : 'rounded-tl-sm bg-[#F0F2F2]'
                      }`}
                    >
                      <div className="mb-1 text-xs font-semibold text-[#565959]">
                        {m.fromStaff ? `${m.authorName} (staff)` : m.authorName} · {when(m.createdAt)}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-[#0F1111]">{m.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="border-t border-[#E3E6E6] bg-[#FAFAFA] px-5 py-4">
                <label htmlFor="admin-support-reply" className="text-sm font-semibold text-[#0F1111]">
                  Reply to customer
                </label>
                <textarea
                  id="admin-support-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={5}
                  maxLength={4000}
                  className="mt-2 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
                />
                {actionError && <p className="mt-2 text-sm text-[#B12704]">{actionError}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => sendReply(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#FFD814] px-5 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60"
                  >
                    {busy === 'reply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send reply
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => sendReply(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-[#D5D9D9] bg-white px-5 py-2 text-sm font-semibold text-[#0F1111] hover:border-[#007185] disabled:opacity-60"
                  >
                    {busy === 'resolve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                    Send and mark resolved
                  </button>
                  <span className="flex-1" />
                  {ticket.status === 'RESOLVED' ? (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act({ status: 'OPEN' }, 'status')}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007185] hover:underline disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" /> Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act({ status: 'RESOLVED' }, 'status')}
                      className="text-sm font-semibold text-[#007185] hover:underline disabled:opacity-60"
                    >
                      Mark resolved without reply
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[#565959]">Loading…</div>}>
      <AdminSupportInner />
    </Suspense>
  );
}

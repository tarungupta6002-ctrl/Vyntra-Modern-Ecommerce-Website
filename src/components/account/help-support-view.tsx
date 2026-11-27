'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  RotateCcw,
  Search,
  Send,
  UserCog,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TicketStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED';
type Topic = 'ORDER' | 'DELIVERY' | 'RETURN_REFUND' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';

interface TicketMessage {
  id: string;
  fromStaff: boolean;
  authorName: string;
  body: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  topic: Topic;
  topicLabel: string;
  subject: string;
  status: TicketStatus;
  statusLabel: string;
  orderNumber: string | null;
  createdAt: string;
  lastMessageAt: string;
  messageCount?: number;
  messages?: TicketMessage[];
}

interface OrderOption {
  orderNumber: string;
  createdAt: string;
  label: string;
}

interface ContactInfo {
  email: string | null;
  phone: string | null;
  hours: string | null;
  grievanceOfficer: { name: string; email: string | null; designation: string | null } | null;
}

interface HelpSupportViewProps {
  embeddedInAccount?: boolean;
}

/* ------------------------------------------------------------------ */
/* Static content: only what the store actually does                   */
/* ------------------------------------------------------------------ */

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'ORDER', label: 'An order' },
  { value: 'DELIVERY', label: 'Delivery or tracking' },
  { value: 'RETURN_REFUND', label: 'Return or refund' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'ACCOUNT', label: 'My account' },
  { value: 'OTHER', label: 'Something else' },
];

const QUICK_LINKS = [
  { title: 'Track or cancel an order', body: 'See status and tracking, or cancel before it ships.', href: '/account?tab=orders', icon: Package },
  { title: 'Return an item', body: 'Start a return within 7 days of delivery.', href: '/account?tab=returns', icon: RotateCcw },
  { title: 'Payments', body: 'How online payments and Cash on Delivery work.', href: '/account?tab=payments', icon: CreditCard },
  { title: 'Addresses', body: 'Add or edit where we deliver.', href: '/account?tab=addresses', icon: MapPin },
  { title: 'Login and profile', body: 'Update your name, phone or password.', href: '/account?tab=profile', icon: UserCog },
];

const FAQ_GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: 'Orders and delivery',
    items: [
      {
        q: 'How much does delivery cost?',
        a: 'Delivery is free. Each order has a ₹49 packaging fee, and Cash on Delivery orders have an extra ₹49 COD fee. You see both at checkout before you pay.',
      },
      {
        q: 'How do I track my order?',
        a: 'Go to Your Orders and open the order. Each seller ships their items separately, so an order can have more than one package. Tracking appears once the seller ships.',
      },
      {
        q: 'Can I cancel an order?',
        a: 'Yes, until it ships. Open the order in Your Orders and choose Cancel. Once a package has shipped it can no longer be cancelled; you can return it after delivery instead.',
      },
      {
        q: 'Can I change the delivery address after ordering?',
        a: 'Not from the website yet. If the order has not shipped, cancel it and order again with the right address, or contact us below and mention the order.',
      },
    ],
  },
  {
    title: 'Returns and refunds',
    items: [
      {
        q: 'What is the return window?',
        a: 'Eligible items can be returned within 7 days of delivery. Some items cannot be returned for change of mind, such as innerwear, swimwear, cosmetics, perfumes, pierced jewellery and customised or made-to-order products. Every product page shows its return policy.',
      },
      {
        q: 'What if my item is damaged, defective or wrong?',
        a: 'Start a return within 7 days of delivery and choose the reason that fits. These items qualify for a refund or replacement, including items that are otherwise non-returnable.',
      },
      {
        q: 'I changed my mind or the size is wrong. Can I get a refund?',
        a: 'For size, fit or preference reasons, eligible items can be exchanged rather than refunded. You are never charged for the return pickup.',
      },
      {
        q: 'When will I get my refund?',
        a: 'Refunds go back to your original payment method. After the refund is issued, banks usually take 5–7 business days to show it. If you paid by Cash on Delivery, we will contact you for refund details.',
      },
      {
        q: 'Is the packaging fee refunded if I cancel?',
        a: 'If you cancel the order before it ships, you get back everything you paid, including the packaging fee. For a return, the refund covers the returned items.',
      },
    ],
  },
  {
    title: 'Payments',
    items: [
      {
        q: 'Which payment methods can I use?',
        a: 'UPI, cards and net banking through Razorpay, or Cash on Delivery where available.',
      },
      {
        q: 'Does Vyntra store my card details?',
        a: 'No. Card and UPI details are entered on Razorpay’s secure checkout, not on Vyntra, and we never see or store them.',
      },
      {
        q: 'Money was deducted but my order failed. What now?',
        a: 'If a payment is taken but the order is not created, the bank usually reverses it automatically within 5–7 business days. If it has not come back, contact us below with the date and amount.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-50 text-amber-800 border-amber-200',
  ANSWERED: 'bg-sky-50 text-sky-800 border-sky-200',
  RESOLVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function readJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const err = new Error(json?.error?.message || 'Something went wrong. Please try again.') as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json.data;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function HelpSupportView({ embeddedInAccount = false }: HelpSupportViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ticketParam = searchParams.get('ticket');

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [contact, setContact] = useState<ContactInfo | null>(null);

  const [faqQuery, setFaqQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // New request form
  const [topic, setTopic] = useState<Topic | ''>((searchParams.get('topic') as Topic) || '');
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Ticket | null>(null);

  // Open conversation
  const [active, setActive] = useState<Ticket | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const data = await readJson(await fetch('/api/support/tickets', { cache: 'no-store' }));
      setTickets(data.tickets || []);
      setSignedIn(true);
    } catch (e: any) {
      if (e?.status === 401) setSignedIn(false);
      else setSignedIn(true);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    fetch('/api/support/contact')
      .then(readJson)
      .then(setContact)
      .catch(() => setContact(null));
  }, [loadTickets]);

  useEffect(() => {
    if (!signedIn) return;
    fetch('/api/orders?limit=30', { cache: 'no-store' })
      .then(readJson)
      .then((data) => {
        const list = (data?.orders || []) as any[];
        setOrders(
          list.map((o) => {
            const first = o.items?.[0]?.title;
            const more = (o.items?.length || 0) > 1 ? ` +${o.items.length - 1} more` : '';
            return {
              orderNumber: o.orderNumber,
              createdAt: o.createdAt,
              label: `${o.orderNumber}${first ? ` · ${first}${more}` : ''}`,
            };
          })
        );
      })
      .catch(() => setOrders([]));
  }, [signedIn]);

  // "Need help?" links land on #support-contact-form, which only renders once we know the user is signed in.
  useEffect(() => {
    if (signedIn && typeof window !== 'undefined' && window.location.hash === '#support-contact-form') {
      document.getElementById('support-contact-form')?.scrollIntoView({ block: 'start' });
    }
  }, [signedIn]);

  // Open the ticket named in the URL (links in emails point here).
  useEffect(() => {
    if (!ticketParam || signedIn !== true) {
      if (!ticketParam) setActive(null);
      return;
    }
    let cancelled = false;
    setActiveLoading(true);
    setActiveError(null);
    fetch(`/api/support/tickets/${encodeURIComponent(ticketParam)}`, { cache: 'no-store' })
      .then(readJson)
      .then((data) => !cancelled && setActive(data.ticket))
      .catch((e) => !cancelled && setActiveError(e.message))
      .finally(() => !cancelled && setActiveLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ticketParam, signedIn]);

  const setTicketParam = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('ticket', value);
    else params.delete('ticket');
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    setReply('');
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!topic) return setFormError('Choose what your request is about.');
    if (subject.trim().length < 4) return setFormError('Add a short subject.');
    if (message.trim().length < 10) return setFormError('Describe the problem in at least 10 characters.');
    setSubmitting(true);
    try {
      const data = await readJson(
        await fetch('/api/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, subject, message, orderNumber: orderNumber || undefined }),
        })
      );
      setCreated(data.ticket);
      setSubject('');
      setMessage('');
      setOrderNumber('');
      setTopic('');
      loadTickets();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || reply.trim().length < 10) {
      setActiveError('Write at least 10 characters.');
      return;
    }
    setReplying(true);
    setActiveError(null);
    try {
      const data = await readJson(
        await fetch(`/api/support/tickets/${encodeURIComponent(active.ticketNumber)}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply }),
        })
      );
      setActive(data.ticket);
      setReply('');
      loadTickets();
    } catch (err: any) {
      setActiveError(err.message);
    } finally {
      setReplying(false);
    }
  };

  const filteredFaq = useMemo(() => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [faqQuery]);

  const loginHref = `/login?redirect=${encodeURIComponent(embeddedInAccount ? '/account?tab=support' : '/support')}`;

  /* ---------------- Conversation view ---------------- */

  if (ticketParam) {
    return (
      <div className="w-full max-w-3xl space-y-4" id="support-thread">
        <button
          type="button"
          onClick={() => setTicketParam(null)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007185] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All help topics and requests
        </button>

        {signedIn === false ? (
          <div className="rounded-xl border border-[#D5D9D9] bg-white p-6 text-sm">
            <Link href={loginHref} className="font-semibold text-[#007185] hover:underline">
              Sign in
            </Link>{' '}
            to see this request.
          </div>
        ) : activeLoading || signedIn === null ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#D5D9D9] bg-white p-6 text-sm text-[#565959]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading request…
          </div>
        ) : !active ? (
          <div className="rounded-xl border border-[#D5D9D9] bg-white p-6 text-sm text-[#0F1111]">
            {activeError || 'Request not found.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
            <div className="border-b border-[#E3E6E6] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[active.status]}`}>
                  {active.statusLabel}
                </span>
                <span className="text-xs text-[#565959]">
                  {active.ticketNumber} · {active.topicLabel}
                  {active.orderNumber ? ` · Order ${active.orderNumber}` : ''}
                </span>
              </div>
              <h2 className="mt-2 text-lg font-bold text-[#0F1111]">{active.subject}</h2>
            </div>

            <ol className="space-y-4 px-5 py-5">
              {(active.messages || []).map((m) => (
                <li key={m.id} className={`flex ${m.fromStaff ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.fromStaff ? 'rounded-tl-sm bg-[#F0F2F2] text-[#0F1111]' : 'rounded-tr-sm bg-[#E6F2F3] text-[#0F1111]'
                    }`}
                  >
                    <div className="mb-1 text-xs font-semibold text-[#565959]">
                      {m.fromStaff ? m.authorName : 'You'} · {formatWhen(m.createdAt)}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {active.status === 'OPEN' && (
              <p className="px-5 pb-2 text-xs text-[#565959]">
                Our team will reply here, and we&apos;ll email you when we do.
              </p>
            )}

            <form onSubmit={sendReply} className="border-t border-[#E3E6E6] bg-[#FAFAFA] px-5 py-4">
              <label htmlFor="support-reply" className="text-sm font-semibold text-[#0F1111]">
                {active.status === 'RESOLVED' ? 'Still need help? Reply to reopen this request' : 'Add a reply'}
              </label>
              <textarea
                id="support-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                maxLength={4000}
                className="mt-2 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
              />
              {activeError && <p className="mt-2 text-sm text-[#B12704]">{activeError}</p>}
              <button
                type="submit"
                disabled={replying}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#FFD814] px-5 py-2 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60"
              >
                {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send reply
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- Main view ---------------- */

  return (
    <div className="w-full space-y-8" id="support-home">
      <div>
        <h1 className={`${embeddedInAccount ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold text-[#0F1111]`}>
          Help &amp; Support
        </h1>
        <p className="mt-1 text-sm text-[#565959]">
          Most order questions can be sorted from Your Orders. For anything else, send us a request and we&apos;ll reply here and by email.
        </p>
      </div>

      {/* Quick links to the places that actually do the job */}
      <section aria-label="Common tasks" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_LINKS.map(({ title, body, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="group flex gap-3 rounded-xl border border-[#D5D9D9] bg-white p-4 transition-colors hover:border-[#007185] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#007185] lg:flex-col"
          >
            <Icon className="h-6 w-6 shrink-0 text-[#007185]" />
            <span>
              <span className="block text-sm font-semibold text-[#0F1111] group-hover:text-[#007185]">{title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-[#565959]">{body}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="faq-heading" className="text-lg font-bold text-[#0F1111]">
              Common questions
            </h2>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search questions</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#565959]" />
              <input
                type="search"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
                placeholder="Search questions"
                className="w-full rounded-lg border border-[#888C8C] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
              />
            </label>
          </div>

          {filteredFaq.length === 0 && (
            <p className="rounded-xl border border-[#D5D9D9] bg-white p-4 text-sm text-[#565959]">
              No questions match “{faqQuery}”. Send us a request instead.
            </p>
          )}

          {filteredFaq.map((group) => (
            <div key={group.title} className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white">
              <h3 className="border-b border-[#E3E6E6] bg-[#F7F8F8] px-4 py-2.5 text-sm font-bold text-[#0F1111]">{group.title}</h3>
              <ul className="divide-y divide-[#E3E6E6]">
                {group.items.map((item) => {
                  const key = `${group.title}:${item.q}`;
                  const open = openFaq === key || faqQuery.trim().length > 0;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(openFaq === key ? null : key)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-[#0F1111] hover:bg-[#F7F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007185]"
                      >
                        {item.q}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[#565959] transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && <p className="px-4 pb-4 text-sm leading-relaxed text-[#333]">{item.a}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        {/* Requests + contact */}
        <aside className="space-y-6">
          {/* Your requests */}
          <section aria-labelledby="requests-heading" className="rounded-xl border border-[#D5D9D9] bg-white">
            <h2 id="requests-heading" className="border-b border-[#E3E6E6] px-4 py-3 text-base font-bold text-[#0F1111]">
              Your requests
            </h2>
            {signedIn === null ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-[#565959]">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : signedIn === false ? (
              <p className="px-4 py-4 text-sm text-[#565959]">
                <Link href={loginHref} className="font-semibold text-[#007185] hover:underline">
                  Sign in
                </Link>{' '}
                to contact us and see your requests.
              </p>
            ) : tickets.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[#565959]">You haven&apos;t contacted us yet.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-[#E3E6E6] overflow-y-auto">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTicketParam(t.ticketNumber)}
                      className="w-full px-4 py-3 text-left hover:bg-[#F7F8F8] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007185]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-semibold text-[#0F1111]">{t.subject}</span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[t.status]}`}>
                          {t.statusLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-[#565959]">
                        {t.ticketNumber} · {formatDay(t.lastMessageAt)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* New request */}
          {signedIn && (
            <section aria-labelledby="contact-heading" className="rounded-xl border border-[#D5D9D9] bg-white p-4" id="support-contact-form">
              <h2 id="contact-heading" className="text-base font-bold text-[#0F1111]">
                Contact us
              </h2>

              {created ? (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Request <strong>{created.ticketNumber}</strong> sent. We&apos;ll reply here and email you when we do.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <button type="button" onClick={() => setTicketParam(created.ticketNumber)} className="font-semibold text-[#007185] hover:underline">
                      View request
                    </button>
                    <button type="button" onClick={() => setCreated(null)} className="font-semibold text-[#007185] hover:underline">
                      Send another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitRequest} className="mt-3 space-y-3" noValidate>
                  <div>
                    <label htmlFor="support-topic" className="text-sm font-semibold text-[#0F1111]">
                      What is it about?
                    </label>
                    <select
                      id="support-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value as Topic)}
                      className="mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
                    >
                      <option value="">Choose a topic</option>
                      {TOPICS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-order" className="text-sm font-semibold text-[#0F1111]">
                      Order <span className="font-normal text-[#565959]">(optional)</span>
                    </label>
                    <select
                      id="support-order"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
                    >
                      <option value="">Not about a specific order</option>
                      {orderNumber && !orders.some((o) => o.orderNumber === orderNumber) && (
                        <option value={orderNumber}>{orderNumber}</option>
                      )}
                      {orders.map((o) => (
                        <option key={o.orderNumber} value={o.orderNumber}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-subject" className="text-sm font-semibold text-[#0F1111]">
                      Subject
                    </label>
                    <input
                      id="support-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Package not delivered"
                      className="mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="support-message" className="text-sm font-semibold text-[#0F1111]">
                      Details
                    </label>
                    <textarea
                      id="support-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={4000}
                      placeholder="What happened, and what would you like us to do?"
                      className="mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20"
                    />
                    <p className="mt-1 text-xs text-[#565959]">Don&apos;t include card numbers, OTPs or passwords. We will never ask for them.</p>
                  </div>

                  {formError && <p className="text-sm text-[#B12704]">{formError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FFD814] px-5 py-2.5 text-sm font-semibold text-[#0F1111] hover:bg-[#F7CA00] disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Send request
                  </button>
                </form>
              )}
            </section>
          )}

          {/* Other ways to reach us: only what is configured */}
          {contact && (contact.email || contact.phone || contact.grievanceOfficer) && (
            <section aria-labelledby="reach-heading" className="rounded-xl border border-[#D5D9D9] bg-white p-4 text-sm">
              <h2 id="reach-heading" className="text-base font-bold text-[#0F1111]">
                Other ways to reach us
              </h2>
              <ul className="mt-3 space-y-2">
                {contact.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#565959]" />
                    <a href={`mailto:${contact.email}`} className="break-all text-[#007185] hover:underline">
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#565959]" />
                    <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="text-[#007185] hover:underline">
                      {contact.phone}
                    </a>
                  </li>
                )}
              </ul>
              {contact.hours && <p className="mt-2 text-xs text-[#565959]">{contact.hours}</p>}
              {signedIn && (
                <p className="mt-2 text-xs text-[#565959]">For order problems, the form above is faster: it attaches your order for us.</p>
              )}

              {contact.grievanceOfficer && (
                <div className="mt-4 border-t border-[#E3E6E6] pt-3">
                  <h3 className="text-sm font-bold text-[#0F1111]">Grievance Officer</h3>
                  <p className="mt-1 text-[#333]">
                    {contact.grievanceOfficer.name}
                    {contact.grievanceOfficer.designation ? `, ${contact.grievanceOfficer.designation}` : ''}
                  </p>
                  {contact.grievanceOfficer.email && (
                    <a href={`mailto:${contact.grievanceOfficer.email}`} className="break-all text-[#007185] hover:underline">
                      {contact.grievanceOfficer.email}
                    </a>
                  )}
                  <p className="mt-1 text-xs text-[#565959]">
                    Under the Consumer Protection (E-Commerce) Rules, 2020, complaints are acknowledged within 48 hours and resolved within one month.
                  </p>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

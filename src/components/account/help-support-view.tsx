'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Headphones,
  RotateCcw,
  Truck,
  CreditCard,
  ShieldCheck,
  Award,
  Gift,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Mail,
  Send,
  Calendar,
  User,
  Paperclip,
  Check,
  Copy,
  ExternalLink,
  X,
  FileText,
  RefreshCw,
  Sparkles,
  ArrowRight,
  MapPin,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

interface HelpSupportViewProps {
  embeddedInAccount?: boolean;
}

interface SupportTicket {
  id: string;
  category: string;
  status: 'In Progress' | 'Resolved' | 'Open';
  title: string;
  liaison: string;
  role: string;
  updatedAt: string;
  orderId?: string;
  messages: Array<{
    sender: 'user' | 'agent' | 'system';
    author: string;
    text: string;
    time: string;
  }>;
}

export function HelpSupportView({ embeddedInAccount = false }: HelpSupportViewProps) {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFaqTab, setActiveFaqTab] = useState<'top' | 'returns' | 'payouts' | 'doorstep'>('top');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  
  // Modals & Drawers
  const [liveChatOpen, setLiveChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: 'Namaste! I am Ananya, your VYNTRA Royal Concierge. How may I assist your wardrobe or order today?',
      time: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('+91 98765 43210');
  const [callbackSlot, setCallbackSlot] = useState('Within 5 minutes (Immediate)');
  const [callbackSuccess, setCallbackSuccess] = useState(false);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState('Tomorrow Morning (10:00 AM - 01:00 PM)');
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const [activeTicketModal, setActiveTicketModal] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // New Ticket Form State
  const [ticketCategory, setTicketCategory] = useState('Returns & Doorstep Size Swaps');
  const [ticketOrder, setTicketOrder] = useState('#VYN-ORD-91044 (Nehru Jacket, ₹14,499)');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'standard' | 'festive'>('standard');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Support Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: '#TCK-88412',
      category: 'Returns & Logistics',
      status: 'In Progress',
      title: 'Doorstep Size Swap fitting variance — Nehru Jacket Ivory 42',
      liaison: 'Kavita Nair',
      role: 'Lead Apparel Care Concierge',
      updatedAt: '24 mins ago',
      orderId: '#VYN-ORD-91044',
      messages: [
        {
          sender: 'user',
          author: 'You',
          text: 'The size 42 Nehru Jacket chest fits slightly tight over a heavy silk kurta. Can the courier carry size 44 as well during tomorrow doorstep swap?',
          time: 'Today, 10:15 AM',
        },
        {
          sender: 'agent',
          author: 'Kavita Nair',
          text: 'Greetings Mr. Sharma. I have locked both Size 44 and Size 42 Altered with BlueDart Priority dispatch. The rider will allow you to try both before handing over the return seal.',
          time: 'Today, 10:39 AM',
        },
      ],
    },
    {
      id: '#TCK-87901',
      category: 'Payments & Vault',
      status: 'Resolved',
      title: 'Double charge tokenization refund for Diwali pre-order',
      liaison: 'Automated Billing Vault Engine',
      role: 'Instant IMPS Settlement',
      updatedAt: 'Resolved Oct 22, 2025',
      orderId: '#VYN-ORD-88219',
      messages: [
        {
          sender: 'user',
          author: 'You',
          text: 'I noticed an accidental duplicate debit of ₹7,850 on HDFC Millennia Card during checkout tokenization.',
          time: 'Oct 22, 02:10 PM',
        },
        {
          sender: 'system',
          author: 'Automated Vault Engine',
          text: 'Payment gateway reconciliation verified duplicate charge. Full reversal of ₹7,850 credited to VYNTRA Vault wallet instantaneously (RRN #9182301923).',
          time: 'Oct 22, 02:18 PM',
        },
      ],
    },
  ]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // 6 Help Categories with Article Counts
  const helpCategories = [
    {
      id: 'orders',
      title: 'Orders & Delivery',
      count: '18 articles',
      description: 'Live tracking, OTP verification, courier scheduling, and white-glove doorstep protocol.',
      icon: Truck,
      color: 'bg-primary/10 text-primary',
      tabKey: 'doorstep' as const,
    },
    {
      id: 'returns',
      title: 'Returns & Refunds',
      count: '24 articles',
      description: '7-day doorstep size swap, tamper-evident tag guidelines, and instant IMPS reversals.',
      icon: RotateCcw,
      color: 'bg-amber-500/10 text-amber-600',
      tabKey: 'returns' as const,
    },
    {
      id: 'payments',
      title: 'Payments & VYNTRA Vault',
      count: '14 articles',
      description: 'Vault wallet balance, tokenized cards, UPI autopay, EMI options, and tax invoices.',
      icon: CreditCard,
      color: 'bg-emerald-500/10 text-emerald-600',
      tabKey: 'payouts' as const,
    },
    {
      id: 'account',
      title: 'Account & Security',
      count: '11 articles',
      description: 'Two-factor authentication, active device sessions, address book, and privacy audit.',
      icon: ShieldCheck,
      color: 'bg-indigo-500/10 text-indigo-600',
      tabKey: 'top' as const,
    },
    {
      id: 'products',
      title: 'Products & Authenticity',
      count: '16 articles',
      description: 'Artisan guild certifications, NFC authenticity tags, pure silk silk-mark, and sizing charts.',
      icon: Award,
      color: 'bg-purple-500/10 text-purple-600',
      tabKey: 'top' as const,
    },
    {
      id: 'offers',
      title: 'Offers & Rewards',
      count: '9 articles',
      description: 'Royal Insider Tier perks, festive vouchers, bridal registry discounts, and referral points.',
      icon: Gift,
      color: 'bg-rose-500/10 text-rose-600',
      tabKey: 'top' as const,
    },
  ];

  // FAQ Items Database
  const faqs = [
    {
      id: 'faq-1',
      category: 'returns',
      badge: 'Size Swap',
      question: 'How does the VYNTRA Doorstep Size Swap work?',
      answer:
        'When you request a size swap, our logistics partner BlueDart Express delivers the newly requested replacement size straight to your doorstep. You try the new fit while the delivery executive waits for up to 10 minutes. If satisfied, you hand over the previous garment in its original tamper-proof pouch. Zero return fees, zero waiting for depot inspection.',
    },
    {
      id: 'faq-2',
      category: 'payouts',
      badge: 'Instant Refund',
      question: 'When is the refund credited after a return pickup?',
      answer:
        'Refunds are triggered instantly upon physical handover. Once the courier executive scans your pickup QR code, our automated IMPS gateway initiates transfer within 15 minutes directly to your source bank account or your VYNTRA Vault wallet, based on your prior preference.',
    },
    {
      id: 'faq-3',
      category: 'doorstep',
      badge: 'Logistics',
      question: 'Can I reschedule my courier delivery or pickup window?',
      answer:
        'Yes. You can reschedule your pickup or delivery slot with a single tap up to 2 hours prior to the booked window. Simply visit the Order Tracking page, select your preferred 3-hour morning or evening slot, or instruct the courier liaison via WhatsApp directly.',
    },
    {
      id: 'faq-4',
      category: 'top',
      badge: 'Authenticity',
      question: 'Are all luxury couture and festive apparel 100% authentic?',
      answer:
        'Every designer garment and jewellery article on VYNTRA is sourced directly from certified ateliers and heritage houses. Items arrive with a cryptographic, tamper-evident security seal containing an NFC/QR tag linking directly to the atelier’s authenticity ledger. If the seal remains intact, genuine replacement is 100% covered.',
    },
    {
      id: 'faq-5',
      category: 'payouts',
      badge: 'VYNTRA Vault',
      question: 'What is VYNTRA Vault and how do 1-click payouts work?',
      answer:
        'VYNTRA Vault is our RBI-compliant digital store credit wallet. Refunds to Vault are credited in under 60 seconds with an additional 2.5% royal bonus credit that never expires. You can spend it instantly across any couture collection or transfer it to any linked UPI VPA anytime without deductions.',
    },
    {
      id: 'faq-6',
      category: 'doorstep',
      badge: 'White Glove',
      question: 'How does the White-Glove Doorstep Trial work for bridal and couture?',
      answer:
        'For bridal lehengas, sherwanis, and bespoke orders exceeding ₹25,000, our dedicated Royal Apparel Care specialist accompanies the courier. They assist with garment steaming, trial room privacy setup, and mark alterations directly on-site if tailored tweaks are required.',
    },
    {
      id: 'faq-7',
      category: 'top',
      badge: 'Safety',
      question: 'What happens if a parcel tamper seal is broken upon delivery?',
      answer:
        'Never accept a parcel with an open or tampered external security barcode ribbon. Instruct the delivery rider to record "Seal Tampered" on their handheld scanner. Our automated dispatch center will instantaneously allocate a fresh replacement unit from our nearest express fulfillment vault.',
    },
    {
      id: 'faq-8',
      category: 'doorstep',
      badge: 'Address Change',
      question: 'How can I change my delivery address after dispatch?',
      answer:
        'If your order is already in transit with BlueDart or Delhivery, you can redirect the shipment to any alternate address within the same metro city PIN radius by tapping "Change Address" on the live tracking page or informing your 24/7 Concierge before the shipment goes out for delivery.',
    },
  ];

  // Filtered FAQs based on Search & Tabs
  const filteredFaqs = useMemo(() => {
    let result = faqs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.badge.toLowerCase().includes(q)
      );
    } else {
      if (activeFaqTab !== 'top') {
        result = result.filter((f) => f.category === activeFaqTab);
      }
    }
    return result;
  }, [faqs, searchQuery, activeFaqTab]);

  // Quick assist pill click
  const handlePillClick = (term: string) => {
    setSearchQuery(term);
    const element = document.getElementById('faqs-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Submit New Support Ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      showToast('Please fill out all required fields.');
      return;
    }

    setTicketSubmitting(true);
    setTimeout(() => {
      const newTicketId = `#TCK-${Math.floor(88500 + Math.random() * 900)}`;
      const newTicket: SupportTicket = {
        id: newTicketId,
        category: ticketCategory,
        status: 'In Progress',
        title: ticketSubject,
        liaison: 'Kavita Nair',
        role: 'Assigned Lead Concierge',
        updatedAt: 'Just now',
        orderId: ticketOrder.startsWith('#') ? ticketOrder.split(' ')[0] : undefined,
        messages: [
          {
            sender: 'user',
            author: 'You',
            text: ticketDescription,
            time: 'Just now',
          },
          {
            sender: 'system',
            author: 'VYNTRA Royal Dispatch',
            text: `Ticket logged with SLA priority: ${
              ticketPriority === 'festive' ? 'Festive Priority (< 30 mins)' : 'Standard (< 4 hours)'
            }. A concierge lead has been notified.`,
            time: 'Just now',
          },
        ],
      };

      setTickets([newTicket, ...tickets]);
      setTicketSubject('');
      setTicketDescription('');
      setAttachedFiles([]);
      setTicketSubmitting(false);
      showToast(`Support Ticket ${newTicketId} created successfully! Our concierge is on it.`);
    }, 600);
  };

  // Live Chat Send Message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages((prev) => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setChatInput('');

    // Simulated Concierge response
    setTimeout(() => {
      let reply = 'Thank you for reaching out. Let me pull up your account records and assist you with this right away.';
      const lower = userText.toLowerCase();
      if (lower.includes('size') || lower.includes('exchange') || lower.includes('swap')) {
        reply = 'I see your recent order for the Raw Silk Nehru Jacket. Our Doorstep Size Swap is already initiated for tomorrow morning (10 AM - 1 PM). Would you like to confirm size 44?';
      } else if (lower.includes('refund') || lower.includes('money') || lower.includes('return')) {
        reply = 'All returns are processed via Instant IMPS or VYNTRA Vault within 15 minutes of physical package handover to the courier. Would you like an instant Vault credit with a 2.5% royal bonus?';
      } else if (lower.includes('track') || lower.includes('where')) {
        reply = 'Your package #VYN-ORD-91044 is currently out with BlueDart Express courier agent Rajesh Kumar (+91 98765 00123). You can track live GPS location on our tracking screen.';
      }

      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  // Reply to active ticket
  const handleSendTicketReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !activeTicketModal) return;

    const updated = {
      ...activeTicketModal,
      updatedAt: 'Just now',
      messages: [
        ...activeTicketModal.messages,
        {
          sender: 'user' as const,
          author: 'You',
          text: ticketReplyText,
          time: 'Just now',
        },
      ],
    };

    setActiveTicketModal(updated);
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setTicketReplyText('');
    showToast('Reply dispatched to your dedicated concierge.');
  };

  return (
    <div className={`space-y-8 ${embeddedInAccount ? '' : 'max-w-6xl mx-auto py-6 px-4 sm:px-6'}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-on-surface text-surface-container-lowest px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/60 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SPOTLIGHT & LIVE ASSIST SEARCH */}
      {/* ------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-container to-[#001859] text-white p-6 sm:p-8 md:p-10 shadow-xl">
        {/* Subtle Decorative Elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-4">
          {/* Live Concierge Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-secondary-container">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-container"></span>
            </span>
            <span>Live Concierge Online • Avg response &lt; 90 secs</span>
          </div>

          <h1 className="font-headline font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
            How may our Concierge assist you today?
          </h1>
          <p className="text-white/80 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Search 200+ articles, order timelines, doorstep size swap protocols, instant vault refunds, and bespoke styling privileges.
          </p>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-1.5 focus-within:ring-2 focus-within:ring-secondary-container transition-all">
              <Search className="h-5 w-5 text-outline ml-3.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question, enter tracking ID, or search 'Doorstep Size Swap'..."
                className="w-full bg-transparent px-3 py-3 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-outline hover:text-on-surface mr-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-outline text-[11px] font-mono mr-2">
                <span>⌘</span>
                <span>K</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const element = document.getElementById('faqs-section');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-container text-white text-xs sm:text-sm font-bold shadow-md transition-all shrink-0"
              >
                Search
              </button>
            </div>
          </div>

          {/* Quick Query Assist Pills */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/60 text-[11px] font-medium mr-1">Quick Assist:</span>
            {[
              'Doorstep Size Swap',
              'Instant Vault Refund',
              'Track Courier',
              'Change Delivery Address',
              'Cancel Order',
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handlePillClick(pill)}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[11px] font-medium transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. CONTEXTUAL RECENT ORDERS ASSISTANCE */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h2 className="font-headline font-bold text-lg text-on-surface">Contextual Help for Recent Orders</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Select an ongoing order below to trigger expedited support, doorstep size swaps, or courier rescheduling.
            </p>
          </div>
          <Link
            href="/orders"
            className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Orders</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Order 1: Raw Silk Nehru Jacket */}
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-surface-container-low shrink-0 border border-surface-container">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWxoI851B2ueIWSVQP_ZdVQjzRgvmBMBeZq4wmTnSQkFfNSuRfQEexlFeEyUlR9rEtC2igP8Zyk3i9x75rQtApKuw0nrIbzajTTZ-VK2xCvrS1wfdIyVnbPowWLxbtjsJgudWGwe5e0uAFIxFiAFOj51FROUGkFwumfNU0WdEiictur6TxahXGuBsPrDXc7mEPZ727yxOhkWoKhygVqq5N6Ccash_hso93Nlgb63A"
                  alt="Raw Silk Nehru Jacket"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-primary">#VYN-ORD-91044</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    Size 42 Exchange Requested
                  </span>
                </div>
                <h3 className="font-headline font-bold text-sm text-on-surface truncate">
                  Raw Silk Festive Nehru Jacket — Ivory Gold
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Amount: ₹14,499 • BlueDart Express
                </p>
                <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                  <div className="text-primary flex items-center gap-1 font-semibold">
                    <Clock className="h-3 w-3" />
                    <span>Doorstep Swap: Arriving Tomorrow, 10 AM - 1 PM</span>
                  </div>
                  <Link
                    href="/orders/VYN-ORD-91044/cancel"
                    className="font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Cancel Order Flow</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <Link
                href="/orders/VYN-928410/tracking"
                className="px-3 py-2 rounded-xl bg-primary text-white font-semibold text-center hover:bg-primary-container transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Live GPS Tracking</span>
              </Link>
              <button
                type="button"
                onClick={() => setRescheduleModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Reschedule</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCallbackModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Courier Liaison</span>
              </button>
            </div>
          </div>

          {/* Order 2: Organic Handloom Linen Kurta Set */}
          <div className="rounded-2xl bg-surface-container-lowest border border-surface-container p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-4">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-surface-container-low shrink-0 border border-surface-container">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCveTPtqMk0s4rTUUFOGQZx3gdQDmDmyhyF9Xb5ekCPsvddYO9s2vvF2sVXMESFfbi5qfZqJ8tZzvojUjtZ0kNM7rfJ380Ulruwz9mWsPb1pYiTwYS7wnTAt79IASzuREMZKN_Ph76wt8cWb2upU6yJirUcgE7rTaRsLaL3YWDoTp0_GMsSIg6HPg8BrdlEkRT1YiIu4993owLdDe7DRGVz3SLKuq3XcowUI6KCJAk"
                  alt="Organic Handloom Linen Kurta Set"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-primary">#VYN-ORD-88219</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Delivered Oct 24, 2025
                  </span>
                </div>
                <h3 className="font-headline font-bold text-sm text-on-surface truncate">
                  Organic Handloom Linen Kurta Set — Natural Beige
                </h3>
                <p className="text-xs text-on-surface-variant font-medium">
                  Amount: ₹7,850 • Pre-paid (HDFC Tokenized)
                </p>
                <div className="pt-1 text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  <span>7-Day Return Window Active (4 days remaining)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-container grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTicketCategory('Returns & Doorstep Size Swaps');
                  setTicketOrder('#VYN-ORD-88219 (Linen Kurta Set, ₹7,850)');
                  setTicketSubject('Doorstep Size Swap request for Linen Kurta Set');
                  document.getElementById('ticket-form-section')?.scrollIntoView({ behavior: 'smooth' });
                  showToast('Populated order details into ticket form below.');
                }}
                className="px-3 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Doorstep Swap</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTicketCategory('Instant Refund & Bank IMPS Inquiry');
                  setTicketOrder('#VYN-ORD-88219 (Linen Kurta Set, ₹7,850)');
                  setTicketSubject('Return & Instant Refund Request for Order #VYN-ORD-88219');
                  document.getElementById('ticket-form-section')?.scrollIntoView({ behavior: 'smooth' });
                  showToast('Return & Refund ticket initialized below.');
                }}
                className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Return / Refund</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Simulating tax invoice download (PDF)...');
                }}
                className="px-3 py-2 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Invoice PDF</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. BROWSE BY HELP CATEGORIES (6 CARDS) */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container" />
            <h2 className="font-headline font-bold text-lg text-on-surface">Browse by Knowledge Categories</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Curated handbooks and policies verified by our Quality Assurance & Royal Logistics team.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(isSelected ? null : cat.id);
                  setActiveFaqTab(cat.tabKey);
                  const element = document.getElementById('faqs-section');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`p-5 rounded-2xl border text-left transition-all group ${
                  isSelected
                    ? 'bg-surface-container-lowest border-primary ring-2 ring-primary/20 shadow-md'
                    : 'bg-surface-container-lowest border-surface-container hover:border-outline hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-outline px-2.5 py-1 rounded-full bg-surface-container">
                    {cat.count}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {cat.description}
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-primary group-hover:gap-1.5 transition-all">
                  <span>Explore articles</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. ACTIVE SUPPORT TICKETS & CASE HISTORY */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="font-headline font-bold text-lg text-on-surface">Active Support Tickets & Grievance History</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Live telemetry and resolution progress tracked under statutory SLA limits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              document.getElementById('ticket-form-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span>Raise New Ticket</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary">{t.id}</span>
                    <span className="text-[11px] text-outline">• {t.category}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'In Progress'
                        ? 'bg-amber-500/10 text-amber-700'
                        : 'bg-emerald-500/10 text-emerald-700'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <h3 className="font-headline font-bold text-sm text-on-surface leading-snug">
                  {t.title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <User className="h-3.5 w-3.5 text-outline" />
                  <span>
                    Liaison: <strong className="text-on-surface font-semibold">{t.liaison}</strong> ({t.role})
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                <span className="text-outline text-[11px] flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t.updatedAt}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTicketModal(t)}
                  className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold transition-colors flex items-center gap-1"
                >
                  <span>View Thread ({t.messages.length})</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. INTERACTIVE FAQS ACCORDION */}
      {/* ------------------------------------------------------------- */}
      <section id="faqs-section" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <h2 className="font-headline font-bold text-lg text-on-surface">Frequently Asked Questions</h2>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Instant answers to our patrons’ most frequent order, sizing, and refund questions.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { key: 'top' as const, label: 'Top Queries' },
              { key: 'returns' as const, label: 'Returns & Swaps' },
              { key: 'payouts' as const, label: 'Instant Payouts' },
              { key: 'doorstep' as const, label: 'Doorstep Protocol' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveFaqTab(tab.key);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeFaqTab === tab.key && !searchQuery
                    ? 'bg-surface-container-lowest text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-lowest text-center space-y-3 border border-surface-container">
              <HelpCircle className="h-8 w-8 text-outline mx-auto" />
              <p className="text-sm font-semibold text-on-surface">No matching FAQs found for &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs text-on-surface-variant">
                Try searching for keywords like &ldquo;swap&rdquo;, &ldquo;courier&rdquo;, or start a live chat with our concierge.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {index + 1}
                      </span>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-container">
                          {faq.badge}
                        </span>
                        <h3 className="font-headline font-semibold text-sm sm:text-base text-on-surface">
                          {faq.question}
                        </h3>
                      </div>
                    </div>
                    <span className="text-outline shrink-0">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed border-t border-surface-container-low bg-surface-container-low/20 animate-in fade-in">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. SPEAK WITH ROYAL CONCIERGE (4 CONTACT CHANNELS) */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <h2 className="font-headline font-bold text-lg text-on-surface">Speak with Royal Concierge</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Four personalized channels designed for rapid, white-glove resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Live Chat */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/10 text-secondary-container">
                  <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                  &lt; 90s SLA
                </span>
              </div>
              <h3 className="font-headline font-bold text-sm text-on-surface">Live Chat Concierge</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Connect instantly with our human luxury specialists or AI diagnostic assistant.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveChatOpen(true)}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Start Live Chat</span>
            </button>
          </div>

          {/* 2. WhatsApp VIP Support */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-600">VIP Channel</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-on-surface">WhatsApp VIP Support</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                +91 98200 VYNTRA. Send photos of alterations, voice notes, or get live tracking pingbacks.
              </p>
            </div>
            <a
              href="https://wa.me/919820089687?text=Hi%20VYNTRA%20Concierge,%20I%20need%20assistance%20with%20my%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          {/* 3. Request a Callback */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-semibold text-outline">8 AM - 11 PM IST</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-on-surface">Request a Callback</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Prefer telephone assistance? A lead customer care officer rings you in under 5 minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCallbackModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
            >
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>Request Call</span>
            </button>
          </div>

          {/* 4. Priority Email Concierge */}
          <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-mono text-outline">2 Hr Turnaround</span>
              </div>
              <h3 className="font-headline font-bold text-sm text-on-surface">Priority Email Concierge</h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                concierge@vyntra.luxury. Dedicated for bespoke fitting queries or high-value claims.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('concierge@vyntra.luxury', 'Email Address')}
              className="w-full py-2.5 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="h-3.5 w-3.5 text-primary" />
              <span>Copy Email Desk</span>
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. RAISE AN OFFICIAL SUPPORT TICKET FORM */}
      {/* ------------------------------------------------------------- */}
      <section
        id="ticket-form-section"
        className="rounded-3xl bg-surface-container-lowest border border-surface-container p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="max-w-3xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary-container" />
            <h2 className="font-headline font-bold text-lg sm:text-xl text-on-surface">
              Still Stuck? Raise an Official Support Ticket
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Generate a tracked case ID with our Escalations & Customer Grievance cell. You will receive real-time SMS and email telemetry.
          </p>
        </div>

        <form onSubmit={handleCreateTicket} className="space-y-5 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface">
                Issue Category <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest appearance-none border border-surface-container"
                >
                  <option>Returns & Doorstep Size Swaps</option>
                  <option>Delayed Courier Delivery & OTP</option>
                  <option>Instant Refund & Bank IMPS Inquiry</option>
                  <option>Damaged or Defective Garment</option>
                  <option>Payment Gateway / Card Tokenization</option>
                  <option>Other Royal Privilege Queries</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              </div>
            </div>

            {/* Associated Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface">
                Associated Order <span className="text-outline font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <select
                  value={ticketOrder}
                  onChange={(e) => setTicketOrder(e.target.value)}
                  className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest appearance-none border border-surface-container"
                >
                  <option>#VYN-ORD-91044 (Nehru Jacket, ₹14,499)</option>
                  <option>#VYN-ORD-88219 (Linen Kurta Set, ₹7,850)</option>
                  <option>#VYN-ORD-81023 (Kanjivaram Silk Saree, ₹28,900)</option>
                  <option>General Query / Unrelated to specific order</option>
                </select>
                <ChevronDown className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface">
              Subject / Short Summary <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              placeholder="e.g., Courier slot change request for tomorrow morning"
              className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface">
              Detailed Description <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              placeholder="Please detail your request or describe any concerns. Include convenient call-back times if applicable..."
              className="w-full p-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest border border-surface-container resize-y"
            />
          </div>

          {/* Attachments Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-on-surface">
              Attach Photos or Invoices <span className="text-outline font-normal">(Max 10MB total)</span>
            </label>
            <div
              onClick={() => {
                const mockFiles = ['garment_front_view.jpg', 'fitting_variance_tag.png'];
                setAttachedFiles(mockFiles);
                showToast('Attached 2 photos to ticket.');
              }}
              className="rounded-2xl p-5 bg-surface-container-low hover:bg-surface-container text-center cursor-pointer transition-colors border-2 border-dashed border-surface-container"
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Paperclip className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-on-surface">
                  {attachedFiles.length > 0
                    ? `Attached: ${attachedFiles.join(', ')}`
                    : 'Click to upload or drag files here'}
                </span>
                <span className="text-[11px] text-outline">Supported formats: JPEG, PNG, PDF, HEIC</span>
              </div>
            </div>
          </div>

          {/* Urgency Radio Selector */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-on-surface">Urgency Level</label>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="radio"
                  name="priority"
                  checked={ticketPriority === 'standard'}
                  onChange={() => setTicketPriority('standard')}
                  className="w-4 h-4 text-primary focus:ring-primary accent-primary"
                />
                <span>Standard (Response &lt; 4 hours)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
                <input
                  type="radio"
                  name="priority"
                  checked={ticketPriority === 'festive'}
                  onChange={() => setTicketPriority('festive')}
                  className="w-4 h-4 text-secondary-container focus:ring-secondary-container accent-secondary-container"
                />
                <span className="flex items-center gap-1 text-secondary-container font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Festive Priority (Response &lt; 30 mins)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={ticketSubmitting}
              className="px-6 py-3 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold hover:bg-primary-container transition-colors shadow-md flex items-center gap-2 disabled:opacity-60"
            >
              <span>{ticketSubmitting ? 'Creating Case...' : 'Submit Official Support Ticket'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. ROYAL SLA & CONSUMER PROTECTION GUARANTEE BANNER */}
      {/* ------------------------------------------------------------- */}
      <section className="rounded-3xl bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low p-6 sm:p-8 border border-surface-container shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface">
                VYNTRA Royal SLA & Consumer Protection Guarantee
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Under the Consumer Protection (E-Commerce) Rules 2020, we hold ourselves accountable to strict turnaround times:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-on-surface">
              <div className="p-3.5 bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container">
                <span className="font-bold text-primary block mb-0.5">Tier 1: Concierge Helpdesk</span>
                <span className="text-on-surface-variant">Immediate response within 5 minutes across chat, phone, and app tickets.</span>
              </div>
              <div className="p-3.5 bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container">
                <span className="font-bold text-secondary-container block mb-0.5">Tier 2: Grievance Escalation</span>
                <span className="text-on-surface-variant">Escalation directly to Nodal Officer within 2 hours of dissatisfaction.</span>
              </div>
            </div>
          </div>

          {/* Statutory Nodal Officer Card */}
          <div className="p-4 bg-surface-container-lowest rounded-2xl shadow-xs border border-surface-container text-xs text-on-surface shrink-0 w-full lg:w-72 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">
              Statutory Nodal Officer
            </span>
            <div className="space-y-1">
              <p className="font-bold text-on-surface text-sm">Mr. Raghavan Sundaram</p>
              <p className="text-outline text-xs">Grievance Redressal Officer</p>
              <p className="text-primary font-mono text-[11px] font-semibold">grievance@vyntra.luxury</p>
              <p className="text-outline text-[11px]">+91 22 6902 4400 (Ext 801)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* MODAL 1: LIVE CHAT CONCIERGE DRAWER */}
      {/* ============================================================= */}
      {liveChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[85vh] sm:h-[600px] shadow-2xl border border-surface-container flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    VK
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-primary" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm">Royal Concierge Desk</h3>
                  <p className="text-[11px] text-white/80">Support Specialist • Online now</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveChatOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-container-low/30">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      m.sender === 'user'
                        ? 'bg-primary text-white rounded-br-xs'
                        : 'bg-surface-container-lowest text-on-surface border border-surface-container rounded-bl-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-outline mt-1 px-1">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-surface-container-lowest border-t border-surface-container flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message to concierge..."
                className="flex-1 h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container"
              />
              <button
                type="submit"
                className="h-11 w-11 rounded-xl bg-primary hover:bg-primary-container text-white flex items-center justify-center shrink-0 shadow-sm"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: TICKET THREAD & REPLY MODAL */}
      {/* ============================================================= */}
      {activeTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-surface-container space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{activeTicketModal.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700">
                    {activeTicketModal.status}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-base text-on-surface mt-1">
                  {activeTicketModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicketModal(null)}
                className="p-1.5 rounded-xl hover:bg-surface-container text-outline hover:text-on-surface"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conversation Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {activeTicketModal.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                    msg.sender === 'user'
                      ? 'bg-primary/5 border-primary/20 ml-6'
                      : msg.sender === 'agent'
                      ? 'bg-amber-500/5 border-amber-500/20 mr-6'
                      : 'bg-surface-container border-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className={msg.sender === 'user' ? 'text-primary' : 'text-amber-800'}>
                      {msg.author}
                    </span>
                    <span className="text-outline font-normal">{msg.time}</span>
                  </div>
                  <p className="text-on-surface-variant">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendTicketReply} className="pt-2 border-t border-surface-container space-y-2 shrink-0">
              <textarea
                rows={2}
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
                placeholder="Write an update or reply to your concierge..."
                className="w-full p-3 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface focus:outline-none focus:bg-surface-container border border-surface-container resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTicketModal(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-semibold text-on-surface"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-container shadow-sm flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  <span>Send Reply</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: REQUEST CALLBACK MODAL */}
      {/* ============================================================= */}
      {callbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-container">
                  Priority Telephony Desk
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">Request a Concierge Callback</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCallbackModalOpen(false);
                  setCallbackSuccess(false);
                }}
                className="p-1 rounded-lg hover:bg-surface-container text-outline"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {callbackSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-headline font-bold text-sm text-on-surface">Callback Confirmed</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                  A lead customer care officer will dial {callbackPhone} within your preferred window: {callbackSlot}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCallbackModalOpen(false);
                    setCallbackSuccess(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCallbackSuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <label className="font-bold text-on-surface">Your Contact Number</label>
                  <input
                    type="tel"
                    required
                    value={callbackPhone}
                    onChange={(e) => setCallbackPhone(e.target.value)}
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-sm text-on-surface border border-surface-container focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">Preferred Time Window</label>
                  <select
                    value={callbackSlot}
                    onChange={(e) => setCallbackSlot(e.target.value)}
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface border border-surface-container focus:outline-none"
                  >
                    <option>Within 5 minutes (Immediate)</option>
                    <option>Today Afternoon (02:00 PM - 04:00 PM)</option>
                    <option>Today Evening (06:00 PM - 08:00 PM)</option>
                    <option>Tomorrow Morning (10:00 AM - 12:00 PM)</option>
                  </select>
                </div>

                <div className="p-3 bg-surface-container rounded-xl text-[11px] text-on-surface-variant leading-relaxed">
                  Calls originate from our verified royal care caller ID: <strong className="text-on-surface">+91 22 6902 4400</strong>.
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCallbackModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow-sm"
                  >
                    Schedule Call
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: RESCHEDULE PICKUP/DELIVERY MODAL */}
      {/* ============================================================= */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-container space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  BlueDart Express Logistics
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">Reschedule Doorstep Swap</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRescheduleModalOpen(false);
                  setRescheduleSuccess(false);
                }}
                className="p-1 rounded-lg hover:bg-surface-container text-outline"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {rescheduleSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="font-headline font-bold text-sm text-on-surface">Doorstep Slot Updated</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                  Courier liaison has locked your updated slot: <strong className="text-on-surface">{rescheduleSlot}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleModalOpen(false);
                    setRescheduleSuccess(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRescheduleSuccess(true);
                }}
                className="space-y-4 text-xs"
              >
                <div className="p-3 bg-surface-container rounded-xl space-y-1">
                  <span className="font-bold text-on-surface block">Order #VYN-ORD-91044</span>
                  <span className="text-[11px] text-on-surface-variant">
                    Raw Silk Festive Nehru Jacket — Size 44 Exchange
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface">Select New Doorstep Slot</label>
                  <select
                    value={rescheduleSlot}
                    onChange={(e) => setRescheduleSlot(e.target.value)}
                    className="w-full h-11 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface border border-surface-container focus:outline-none"
                  >
                    <option>Tomorrow Morning (10:00 AM - 01:00 PM)</option>
                    <option>Tomorrow Afternoon (02:00 PM - 05:00 PM)</option>
                    <option>Day After Tomorrow (10:00 AM - 01:00 PM)</option>
                    <option>Weekend Slot: Saturday (11:00 AM - 02:00 PM)</option>
                  </select>
                </div>

                <p className="text-[11px] text-outline">
                  Rescheduling is complimentary up to 2 hours before the scheduled pickup run.
                </p>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container shadow-sm"
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

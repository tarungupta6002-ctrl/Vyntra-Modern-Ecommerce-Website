'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  Shield,
  Smartphone,
  QrCode,
  Building2,
  CheckCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  RotateCcw,
  Download,
  AlertTriangle,
  Info,
  X,
  Sparkles,
  Zap,
  ArrowRight,
  Lock,
  Coins,
  Wallet,
  Landmark,
  BadgePercent,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  usePaymentVaultStore,
  SavedCard,
  SavedUpi,
  LinkedBankAccount,
  VaultTransaction,
} from '@/store/payment-vault-store';
import { formatINR } from '@/lib/utils';

interface SavedPaymentsVaultViewProps {
  embeddedInAccount?: boolean;
}

export function SavedPaymentsVaultView({
  embeddedInAccount = false,
}: SavedPaymentsVaultViewProps) {
  const [mounted, setMounted] = useState(false);
  const store = usePaymentVaultStore();

  // Dropdown & Modal states
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'card' | 'upi' | 'bank';
    id: string;
    title: string;
  } | null>(null);

  // Form states
  const [newCardBank, setNewCardBank] = useState('HDFC Bank');
  const [newCardName, setNewCardName] = useState('');
  const [newCardNetwork, setNewCardNetwork] = useState<'VISA' | 'Mastercard' | 'RuPay'>('VISA');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [newCardHolder, setNewCardHolder] = useState('ARYA SHARMA');
  const [newCardExpMonth, setNewCardExpMonth] = useState('08');
  const [newCardExpYear, setNewCardExpYear] = useState('28');

  const [newUpiApp, setNewUpiApp] = useState<'GPay' | 'PhonePe' | 'Paytm' | 'BHIM' | 'Other'>('GPay');
  const [newUpiVpa, setNewUpiVpa] = useState('');

  const [newBankName, setNewBankName] = useState('HDFC Bank Limited');
  const [newBankShort, setNewBankShort] = useState('HDFC');
  const [newBankBranch, setNewBankBranch] = useState('Koramangala, Bengaluru');
  const [newBankLast4, setNewBankLast4] = useState('');
  const [newBankIfsc, setNewBankIfsc] = useState('HDFC0001234');

  const [voucherCode, setVoucherCode] = useState('');
  const [topUpAmount, setTopUpAmount] = useState(1000);
  const [transferAmount, setTransferAmount] = useState(2000);
  const [selectedTransferBankId, setSelectedTransferBankId] = useState(store.linkedBanks[0]?.id || '');

  // Ledger Filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'vault' | 'refund' | 'order'>('all');

  // Toast feedback
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (ledgerFilter === 'all') return store.transactions;
    if (ledgerFilter === 'vault') return store.transactions.filter((t) => t.category === 'vault' || t.category === 'bonus');
    if (ledgerFilter === 'refund') return store.transactions.filter((t) => t.category === 'refund');
    if (ledgerFilter === 'order') return store.transactions.filter((t) => t.category === 'order');
    return store.transactions;
  }, [store.transactions, ledgerFilter]);

  // Handlers
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardLast4 || newCardLast4.length !== 4) {
      showToast('Please enter the last 4 digits of your card for safe identification.', 'error');
      return;
    }

    store.addSavedCard({
      bankName: newCardBank,
      cardName: newCardName.trim() || 'Premium Platinum Card',
      network: newCardNetwork,
      networkTier: newCardNetwork === 'VISA' ? 'Signature' : newCardNetwork === 'Mastercard' ? 'Titanium' : 'Select',
      last4: newCardLast4,
      cardholderName: newCardHolder.trim().toUpperCase() || 'ARYA SHARMA',
      expiryMonth: newCardExpMonth,
      expiryYear: newCardExpYear,
      isDefault: store.savedCards.length === 0,
      tokenizedBadge: 'RBI Tokenized',
      gradientTheme:
        newCardNetwork === 'VISA'
          ? 'from-[#283044] via-[#007185] to-[#283044]'
          : newCardNetwork === 'Mastercard'
          ? 'from-[#444653] via-[#283044] to-[#0F1111]'
          : 'from-[#0042b2] via-[#007185] to-[#00174b]',
    });

    setCardModalOpen(false);
    setNewCardName('');
    setNewCardLast4('');
    showToast(`${newCardBank} •••• ${newCardLast4} tokenized and saved securely!`, 'success');
  };

  const handleAddUpi = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVpa = newUpiVpa.trim().toLowerCase();
    if (!cleanVpa || !cleanVpa.includes('@')) {
      showToast('Please enter a valid UPI VPA (e.g. name@okhdfcbank or 9876543210@paytm).', 'error');
      return;
    }

    const appTitles: Record<string, string> = {
      GPay: 'Google Pay UPI',
      PhonePe: 'PhonePe UPI',
      Paytm: 'Paytm Payments Bank',
      BHIM: 'BHIM UPI',
      Other: 'Standard UPI Address',
    };

    store.addSavedUpi({
      app: newUpiApp,
      vpa: cleanVpa,
      title: appTitles[newUpiApp] || 'Verified UPI',
      isDefault: store.savedUpi.length === 0,
      isVerified: true,
    });

    setUpiModalOpen(false);
    setNewUpiVpa('');
    showToast(`UPI ID ${cleanVpa} verified and saved!`, 'success');
  };

  const handleLinkBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankLast4 || newBankLast4.length !== 4) {
      showToast('Please enter the last 4 digits of your bank account.', 'error');
      return;
    }

    store.addLinkedBank({
      bankName: newBankName,
      shortName: newBankShort || newBankName.split(' ')[0],
      branch: newBankBranch,
      accountNumberMasked: `••••••••${newBankLast4}`,
      ifsc: newBankIfsc.toUpperCase(),
      isPrimaryRefund: store.linkedBanks.length === 0,
      isPennyDropVerified: true,
    });

    setBankModalOpen(false);
    setNewBankLast4('');
    showToast(`${newBankName} account successfully linked with penny-drop verification!`, 'success');
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'card') {
      store.removeSavedCard(deleteConfirm.id);
      showToast(`Removed ${deleteConfirm.title} from saved cards.`, 'info');
    } else if (deleteConfirm.type === 'upi') {
      store.removeSavedUpi(deleteConfirm.id);
      showToast(`Removed UPI ID ${deleteConfirm.title}.`, 'info');
    } else if (deleteConfirm.type === 'bank') {
      store.unlinkBank(deleteConfirm.id);
      showToast(`Unlinked ${deleteConfirm.title} bank account.`, 'info');
    }
    setDeleteConfirm(null);
  };

  const handleRedeemVoucher = () => {
    if (!voucherCode.trim()) {
      showToast('Please enter a voucher code (try FESTIVE500 or VYNTRA1000).', 'error');
      return;
    }
    const res = store.redeemVoucher(voucherCode);
    if (res.success) {
      showToast(res.message, 'success');
      setVoucherCode('');
      setTopUpModalOpen(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleTransferToBank = () => {
    const res = store.transferToBank(transferAmount, selectedTransferBankId);
    if (res.success) {
      showToast(res.message, 'success');
      setTransferModalOpen(false);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDownloadStatement = () => {
    const headers = ['Transaction ID', 'Date', 'Description', 'Method', 'Type', 'Amount (INR)', 'Status'];
    const rows = store.transactions.map((t) => [
      t.referenceId,
      t.date,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.method.replace(/"/g, '""')}"`,
      t.type,
      t.amount,
      t.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vyntra-vault-statement-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Financial Ledger statement downloaded in CSV format.', 'success');
  };

  if (!mounted) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#565959] font-medium">Opening Vyntra Royal Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 antialiased text-[#0F1111]">
      {/* Toast Feedback */}
      {toast.show && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#0F1111] text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle className="h-5 w-5 text-[#FF9900] shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-white/60 hover:text-white ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page Header & Global Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D5D9D9]">
        <div className="space-y-1">
          {!embeddedInAccount ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-label text-[#565959] mb-2">
              <Link href="/" className="hover:text-[#007185] transition-colors">
                Home
              </Link>
              <span className="text-[10px]">/</span>
              <Link href="/account" className="hover:text-[#007185] transition-colors">
                My Account
              </Link>
              <span className="text-[10px]">/</span>
              <span className="text-[#0F1111] font-semibold">Saved Payments &amp; Vyntra Vault</span>
            </nav>
          ) : (
            <div className="flex items-center gap-2 text-xs font-label text-[#565959] mb-2">
              <span>Preferences &amp; Records</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
              <span className="text-[#007185] font-semibold">Saved Payments &amp; Vyntra Vault</span>
            </div>
          )}

          <h1 className="font-headline font-extrabold text-2xl lg:text-3xl text-[#007185] tracking-tight">
            Payment Methods &amp; Vyntra Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#444653] max-w-2xl font-body">
            Manage your stored cards, UPI handles, linked bank accounts and instant store credits with bank-grade
            256-bit encryption.
          </p>
        </div>

        {/* Quick Add Button with Action Dropdown */}
        <div className="relative inline-block text-left shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => setAddDropdownOpen(!addDropdownOpen)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white font-label text-xs uppercase tracking-wider font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Payment Method</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${addDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {addDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl z-30 py-2 border border-[#D5D9D9] animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => {
                  setAddDropdownOpen(false);
                  setCardModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[#0F1111] font-medium hover:bg-[#F7F8F8] transition-colors text-left"
              >
                <CreditCard className="h-4 w-4 text-[#007185]" />
                <span>Debit / Credit Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDropdownOpen(false);
                  setUpiModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[#0F1111] font-medium hover:bg-[#F7F8F8] transition-colors text-left"
              >
                <Smartphone className="h-4 w-4 text-[#FF9900]" />
                <span>UPI ID / Virtual Address</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddDropdownOpen(false);
                  setBankModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-[#0F1111] font-medium hover:bg-[#F7F8F8] transition-colors text-left"
              >
                <Building2 className="h-4 w-4 text-[#0042b2]" />
                <span>Bank Account (IMPS Refund)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VYNTRA Vault Spotlight Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#007185] via-[#004B57] to-[#002e81] text-white shadow-xl p-6 lg:p-8">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#FF9900]/10 blur-3xl pointer-events-none" />
        <div className="absolute right-10 bottom-2 opacity-10 pointer-events-none">
          <Sparkles className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[#FFE4B5]" />
              </div>
              <span className="text-xs uppercase tracking-widest font-label font-bold text-[#dde1ff]">
                Vyntra Royal Vault
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-label font-bold uppercase tracking-wider bg-[#FF9900] text-white shadow-sm">
                Instant 1-Click Checkout Eligible
              </span>
            </div>

            <div>
              <span className="text-xs text-[#b8c4ff] block uppercase tracking-wider font-label mb-1">
                Total Usable Liquidity
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline font-extrabold text-4xl lg:text-5xl tracking-tight text-white">
                  {formatINR(store.totalLiquidity)}
                </span>
                <span className="text-xs font-label text-[#b8c4ff]">INR</span>
              </div>
            </div>

            {/* Sub-Balances Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                <span className="text-[11px] text-[#b8c4ff] block mb-0.5">Store Credits &amp; Refunds</span>
                <span className="font-headline font-bold text-sm tracking-tight text-white">
                  {formatINR(store.storeCredits)}
                </span>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                <span className="text-[11px] text-[#b8c4ff] block mb-0.5">Festive Cashback Bonus</span>
                <span className="font-headline font-bold text-sm tracking-tight text-[#FFE4B5]">
                  {formatINR(store.cashbackBonus)}
                </span>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-md p-3 border border-white/10">
                <span className="text-[11px] text-[#b8c4ff] block mb-0.5">Vyntra SuperCoins</span>
                <span className="font-headline font-bold text-sm tracking-tight text-white">
                  {store.superCoins}{' '}
                  <span className="text-xs font-normal opacity-75">(₹{store.superCoins} value)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Vault Action Cluster */}
          <div className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex flex-col sm:flex-row xl:flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setTopUpModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#FF9900] hover:bg-[#904d00] text-white font-label text-xs uppercase tracking-wider font-bold transition-all shadow-md active:scale-95"
              >
                <Wallet className="h-4 w-4" />
                <span>Add Money / Redeem Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setTransferModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-label text-xs uppercase tracking-wider font-semibold backdrop-blur transition-all active:scale-95 border border-white/20"
              >
                <Landmark className="h-4 w-4" />
                <span>Transfer to Bank Account</span>
              </button>
            </div>

            {/* Auto-Top-Up Mini Switch */}
            <div className="rounded-xl bg-white/10 backdrop-blur p-3 flex items-center justify-between gap-3 border border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                <RotateCcw className="h-4 w-4 text-[#FFE4B5] shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold block text-white truncate">
                    Auto-add ₹2,000 on low balance
                  </span>
                  <span className="text-[10px] text-[#b8c4ff] block truncate">Triggered when below ₹500</span>
                </div>
              </div>
              <button
                type="button"
                aria-pressed={store.preferences.autoTopUpEnabled}
                onClick={() => {
                  store.toggleAutoTopUp();
                  showToast(
                    store.preferences.autoTopUpEnabled
                      ? 'Auto-top up disabled.'
                      : 'Auto-top up activated (₹2,000 top-up when below ₹500).',
                    'info'
                  );
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                  store.preferences.autoTopUpEnabled ? 'bg-[#FF9900]' : 'bg-white/30'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    store.preferences.autoTopUpEnabled ? 'translate-x-4.5 translate-y-0.5' : 'translate-x-1 translate-y-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Mini Instant Refund Ticker */}
        <div className="mt-6 pt-4 bg-white/5 rounded-xl px-4 py-2.5 flex items-center gap-3 border border-white/5">
          <Zap className="h-4 w-4 text-[#FFE4B5] shrink-0" />
          <p className="text-xs text-[#b8c4ff] font-body">
            <span className="font-semibold text-white">Latest Credit:</span> ₹2,499 instant refund from Raw Silk
            Nehru Jacket credited yesterday at 10:14 AM.
          </p>
        </div>
      </section>

      {/* Main Content Grid: 2 Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Saved Methods & Ledger */}
        <div className="xl:col-span-2 space-y-10">
          {/* SECTION 1: Saved UPI Accounts */}
          <section className="space-y-4" id="saved-upi">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F7F8F8] flex items-center justify-center text-[#007185]">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h2 className="font-headline font-bold text-lg text-[#0F1111]">
                  UPI Accounts (Instant &amp; Zero Surcharge)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUpiModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-[#007185] hover:text-[#004B57] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add New UPI ID</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {store.savedUpi.map((upi) => (
                <div
                  key={upi.id}
                  className="rounded-2xl bg-white p-4 shadow-sm border border-[#D5D9D9] hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#F7F8F8] flex items-center justify-center font-bold text-xs text-[#007185]">
                        {upi.app === 'GPay' ? 'GPay' : upi.app === 'PhonePe' ? 'पे' : upi.app === 'Paytm' ? 'PTM' : 'UPI'}
                      </div>
                      {upi.isVerified && (
                        <div className="flex items-center gap-1 bg-[#F7F8F8] px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#007185]">
                          <CheckCircle className="h-3 w-3" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-label text-[#565959] mb-0.5">{upi.title}</div>
                    <div
                      className="font-headline font-bold text-sm text-[#0F1111] truncate mb-3"
                      title={upi.vpa}
                    >
                      {upi.vpa}
                    </div>

                    {upi.isDefault && (
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#dde1ff] text-[#007185] text-[10px] font-label font-bold uppercase tracking-wider mb-4">
                        Default for 1-Click Buy
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#D5D9D9] text-xs font-label">
                    {!upi.isDefault ? (
                      <button
                        type="button"
                        onClick={() => {
                          store.setDefaultUpi(upi.id);
                          showToast(`${upi.vpa} set as default UPI for 1-click buy!`, 'success');
                        }}
                        className="text-[#007185] font-semibold hover:underline"
                      >
                        Set as Default
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Default Active
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          type: 'upi',
                          id: upi.id,
                          title: upi.vpa,
                        })
                      }
                      className="text-[#ba1a1a] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* UPI Autopay Banner */}
            <div className="rounded-xl bg-[#F7F8F8] p-3.5 flex items-center justify-between gap-3 text-xs border border-[#D5D9D9]">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="h-4 w-4 text-[#FF9900] shrink-0" />
                <span className="text-[#0F1111] font-body">
                  <strong>Active Standing Mandate:</strong> Vyntra Luxury Club Tier-1 Membership renewal at ₹299 /
                  quarter.
                </span>
              </div>
              <button
                type="button"
                onClick={() => showToast('Standing mandates are securely tokenized with NPCI UPI Autopay.', 'info')}
                className="text-[#007185] font-label font-semibold hover:underline shrink-0"
              >
                Manage Mandates
              </button>
            </div>
          </section>

          {/* SECTION 2: Saved Credit & Debit Cards */}
          <section className="space-y-4" id="saved-cards">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F7F8F8] flex items-center justify-center text-[#007185]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg text-[#0F1111]">Saved Credit &amp; Debit Cards</h2>
                  <span className="text-[11px] text-[#565959] font-label">
                    RBI Tokenized &amp; 256-bit AES Hardware Encrypted
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCardModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-[#007185] hover:text-[#004B57] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {store.savedCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-2xl p-5 bg-gradient-to-br ${card.gradientTheme} text-white shadow-lg relative flex flex-col justify-between min-h-[210px] overflow-hidden`}
                >
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#FF9900]/20 blur-xl pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-[#b8c4ff] block font-label">
                          {card.bankName}
                        </span>
                        <span className="font-headline font-bold text-sm tracking-tight text-white">
                          {card.cardName}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-headline font-black italic tracking-tighter text-lg text-white">
                          {card.network}
                        </span>
                        {card.networkTier && (
                          <span className="text-[9px] uppercase tracking-wider text-[#FFE4B5]">
                            {card.networkTier}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-headline text-lg font-bold tracking-widest text-white my-2">
                      <span>••••</span>
                      <span>••••</span>
                      <span>••••</span>
                      <span className="text-[#FFE4B5]">{card.last4}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-[#b8c4ff] font-label mb-2">
                      <span>
                        CARDHOLDER: <strong className="text-white">{card.cardholderName}</strong>
                      </span>
                      <span>
                        EXP:{' '}
                        <strong className="text-white">
                          {card.expiryMonth}/{card.expiryYear}
                        </strong>
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[10px] border-t border-white/10">
                      {card.isDefault ? (
                        <span className="px-2 py-0.5 rounded bg-[#FF9900] text-white font-bold uppercase tracking-wider">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            store.setDefaultCard(card.id);
                            showToast(`${card.bankName} •••• ${card.last4} set as default card.`, 'success');
                          }}
                          className="text-[#FFE4B5] hover:underline font-bold"
                        >
                          Set Default
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[#b8c4ff]">
                          <ShieldCheck className="h-3 w-3" />
                          <span>{card.tokenizedBadge}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirm({
                              type: 'card',
                              id: card.id,
                              title: `${card.bankName} •••• ${card.last4}`,
                            })
                          }
                          className="text-white/60 hover:text-white ml-1"
                          title="Remove card"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Security Note & Management Strip */}
            <div className="rounded-xl bg-white p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm border border-[#D5D9D9]">
              <div className="flex items-center gap-2 text-[#565959] font-body">
                <Info className="h-4 w-4 text-[#007185] shrink-0" />
                <span>CVV will always be requested for checkout authentication as per RBI compliance guidelines.</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-label shrink-0">
                <button
                  type="button"
                  onClick={() => showToast('Card nicknames synced across your secure vault.', 'info')}
                  className="text-[#007185] hover:underline"
                >
                  Edit Nicknames
                </button>
                <span className="text-[#c4c5d5]">|</span>
                <button
                  type="button"
                  onClick={() => showToast('No expired cards found in your vault.', 'info')}
                  className="text-[#ba1a1a] hover:underline"
                >
                  Remove Expired
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 3: Linked Bank Accounts */}
          <section className="space-y-4" id="linked-banks">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F7F8F8] flex items-center justify-center text-[#007185]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg text-[#0F1111]">Linked Bank Accounts</h2>
                  <span className="text-[11px] text-[#565959] font-label">
                    Configured for High-Speed Direct IMPS Refunds
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-[#007185] hover:text-[#004B57] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>+ Link Another Bank Account</span>
              </button>
            </div>

            {store.linkedBanks.map((bank) => (
              <div
                key={bank.id}
                className="rounded-2xl bg-white p-5 shadow-sm border border-[#D5D9D9] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F7F8F8] flex items-center justify-center text-[#007185] font-headline font-bold text-lg shrink-0">
                    {bank.shortName}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-sm text-[#0F1111]">{bank.bankName}</span>
                      {bank.isPrimaryRefund && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-label font-bold uppercase bg-[#F7F8F8] text-[#007185]">
                          Primary Refund
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#444653] font-body">
                      {bank.branch} • Account: <span className="font-mono font-semibold">{bank.accountNumberMasked}</span>
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-[#565959]">
                      <span>
                        IFSC: <strong className="text-[#0F1111]">{bank.ifsc}</strong>
                      </span>
                      <span>•</span>
                      {bank.isPennyDropVerified && (
                        <span className="text-[#007185] font-semibold flex items-center gap-0.5">
                          <CheckCircle className="h-3 w-3" /> Penny-Drop Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      showToast(`Bank statement link for ${bank.bankName} verified via open banking API.`, 'info')
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#F7F8F8] hover:bg-[#D5D9D9] text-xs font-label font-semibold text-[#0F1111] transition-colors"
                  >
                    View Statement Link
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        type: 'bank',
                        id: bank.id,
                        title: bank.bankName,
                      })
                    }
                    className="p-1.5 rounded-lg text-[#565959] hover:text-[#ba1a1a] transition-colors"
                    title="Unlink Bank"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* SECTION 4: Financial Ledger & Vault History */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-headline font-bold text-lg text-[#0F1111]">Financial Ledger &amp; Vault History</h2>
                <p className="text-xs text-[#565959]">All orders, refunds, instant swaps, and voucher credits</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadStatement}
                className="inline-flex items-center gap-1.5 text-xs font-label font-bold text-[#007185] hover:underline"
              >
                <Download className="h-4 w-4" />
                <span>Download Full Statement (CSV)</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-[#D5D9D9] overflow-hidden">
              {/* Ledger Tabs */}
              <div className="flex items-center gap-6 px-6 pt-4 bg-[#F7F8F8] text-xs font-label border-b border-[#D5D9D9]">
                {(
                  [
                    { key: 'all', label: 'All Transactions' },
                    { key: 'vault', label: 'Vault History' },
                    { key: 'refund', label: 'Refunds' },
                    { key: 'order', label: 'Card Debits' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLedgerFilter(tab.key)}
                    className={`pb-3 font-bold transition-all relative ${
                      ledgerFilter === tab.key
                        ? 'text-[#007185] border-b-2 border-[#007185]'
                        : 'text-[#565959] hover:text-[#0F1111]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Transaction Rows */}
              <div className="divide-y divide-[#D5D9D9]">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 sm:px-6 hover:bg-[#F7F8F8]/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#F7F8F8] flex items-center justify-center text-[#007185] shrink-0 mt-0.5">
                        {tx.type === 'credit' ? (
                          <RotateCcw className="h-4 w-4 text-[#FF9900]" />
                        ) : tx.type === 'swap' ? (
                          <Sparkles className="h-4 w-4 text-[#007185]" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-[#444653]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-headline font-semibold text-xs text-[#0F1111] truncate">
                          {tx.title} ({tx.referenceId})
                        </div>
                        <div className="text-[11px] text-[#565959] flex items-center gap-2 mt-0.5">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>Method: {tx.method}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-headline font-bold text-xs ${
                            tx.amount > 0
                              ? 'text-[#FF9900]'
                              : tx.amount < 0
                              ? 'text-[#0F1111]'
                              : 'text-[#007185]'
                          }`}
                        >
                          {tx.amount > 0 ? `+${formatINR(tx.amount)}` : tx.amount < 0 ? `-${formatINR(Math.abs(tx.amount))}` : '+₹0.00'}
                        </div>
                        {tx.statusNote && <span className="text-[10px] text-[#565959]">{tx.statusNote}</span>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-label font-bold uppercase bg-[#F7F8F8] text-[#007185]">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column (1 Col): Preferences & Security Shield */}
        <div className="space-y-6">
          {/* Payment Preferences Card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#D5D9D9] space-y-5">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#007185]" />
              <h3 className="font-headline font-bold text-base text-[#0F1111]">Payment Preferences</h3>
            </div>

            <div className="space-y-4">
              {/* Toggle 1: Fast 1-Click Checkout */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-headline font-semibold text-xs text-[#0F1111] block">
                    Fast 1-Click Checkout
                  </span>
                  <p className="text-[11px] text-[#565959] font-body leading-tight mt-0.5">
                    Automatically selects your default card or UPI for express orders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => store.togglePreference('oneClickCheckout')}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${
                    store.preferences.oneClickCheckout ? 'bg-[#007185]' : 'bg-[#c4c5d5]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      store.preferences.oneClickCheckout ? 'translate-x-4.5 translate-y-0.5' : 'translate-x-1 translate-y-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Auto-Apply Vault Balance */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-headline font-semibold text-xs text-[#0F1111] block">
                    Auto-Apply Vyntra Vault Balance
                  </span>
                  <p className="text-[11px] text-[#565959] font-body leading-tight mt-0.5">
                    Exhaust available store credits before charging linked payment sources.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => store.togglePreference('autoApplyVaultBalance')}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${
                    store.preferences.autoApplyVaultBalance ? 'bg-[#007185]' : 'bg-[#c4c5d5]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      store.preferences.autoApplyVaultBalance ? 'translate-x-4.5 translate-y-0.5' : 'translate-x-1 translate-y-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: International Transactions (Disabled) */}
              <div className="flex items-start justify-between gap-3 opacity-60">
                <div>
                  <span className="font-headline font-semibold text-xs text-[#0F1111] block">
                    International Transactions
                  </span>
                  <p className="text-[11px] text-[#565959] font-body leading-tight mt-0.5">
                    Allow non-INR cross-border cards for global luxury imports.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed rounded-full bg-[#dae2fd] transition-colors"
                >
                  <span className="inline-block h-3.5 w-3.5 transform translate-x-1 translate-y-0.5 rounded-full bg-white shadow transition" />
                </button>
              </div>

              {/* Toggle 4: Two-Factor Biometric Approval */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-headline font-semibold text-xs text-[#0F1111] block">
                    Two-Factor Biometric Approval
                  </span>
                  <p className="text-[11px] text-[#565959] font-body leading-tight mt-0.5">
                    SMS OTP + Face ID confirmation on transactions over ₹10,000.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => store.togglePreference('biometricTwoFactor')}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none ${
                    store.preferences.biometricTwoFactor ? 'bg-[#007185]' : 'bg-[#c4c5d5]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                      store.preferences.biometricTwoFactor ? 'translate-x-4.5 translate-y-0.5' : 'translate-x-1 translate-y-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Vault Top-Up Widget */}
          <div className="rounded-2xl bg-[#F7F8F8] p-6 space-y-4 border border-[#D5D9D9]">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-sm text-[#0F1111]">Express Vault Top-Up</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-label font-bold bg-[#FF9900] text-white uppercase">
                +5% Bonus
              </span>
            </div>
            <p className="text-xs text-[#444653] font-body">
              Add instant funds using UPI or linked Netbanking. Instant access on checkout.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    const bonus = Math.round(amt * 0.05);
                    store.topUpVault(amt, bonus);
                    showToast(`Added ${formatINR(amt)} + ${formatINR(bonus)} Festive Bonus to Vault!`, 'success');
                  }}
                  className="py-2 rounded-xl bg-white hover:bg-[#007185] hover:text-white text-xs font-headline font-bold text-[#007185] transition-colors border border-[#D5D9D9] shadow-sm"
                >
                  + {formatINR(amt)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTopUpModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#007185] hover:bg-[#004B57] text-white text-xs font-label uppercase font-bold tracking-wider transition-colors shadow-sm"
            >
              Proceed to Custom Top-Up / Voucher
            </button>
          </div>

          {/* Trust & Bank-Grade Security Assurance Box */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#D5D9D9] space-y-5">
            <div className="flex items-center gap-2 text-[#007185]">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-headline font-bold text-sm text-[#0F1111]">Vyntra Royal Security Shield</h3>
            </div>
            <p className="text-xs text-[#444653] font-body leading-relaxed">
              Vyntra never retains your raw 16-digit card numbers or sensitive CVV codes. All payments are strictly
              processed using cryptographically encrypted token channels approved by the Reserve Bank of India.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-[#F7F8F8] flex items-center gap-2 border border-[#D5D9D9]">
                <Lock className="h-4 w-4 text-[#007185] shrink-0" />
                <div className="text-[10px] font-label leading-tight">
                  <span className="font-bold text-[#0F1111] block">256-Bit SSL</span>
                  <span className="text-[#565959]">Bank Grade</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F7F8F8] flex items-center gap-2 border border-[#D5D9D9]">
                <ShieldCheck className="h-4 w-4 text-[#007185] shrink-0" />
                <div className="text-[10px] font-label leading-tight">
                  <span className="font-bold text-[#0F1111] block">PCI-DSS L1</span>
                  <span className="text-[#565959]">Global Compliant</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F7F8F8] flex items-center gap-2 border border-[#D5D9D9]">
                <Coins className="h-4 w-4 text-[#FF9900] shrink-0" />
                <div className="text-[10px] font-label leading-tight">
                  <span className="font-bold text-[#0F1111] block">RBI Tokenized</span>
                  <span className="text-[#565959]">NPCI &amp; Visa Vault</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F7F8F8] flex items-center gap-2 border border-[#D5D9D9]">
                <Shield className="h-4 w-4 text-[#FF9900] shrink-0" />
                <div className="text-[10px] font-label leading-tight">
                  <span className="font-bold text-[#0F1111] block">Zero Fraud</span>
                  <span className="text-[#565959]">Full Liability Cover</span>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-[#565959] text-center font-label">
              Need assistance with payment disputes?{' '}
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#007185] font-semibold hover:underline"
              >
                Contact Concierge
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: ADD NEW CARD */}
      {/* ============================================================= */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#007185]" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">Add New Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F7F8F8] rounded-xl text-xs text-[#444653] flex items-start gap-2 border border-[#D5D9D9]">
              <ShieldCheck className="h-4 w-4 text-[#007185] shrink-0 mt-0.5" />
              <span>
                <strong>RBI Card Tokenization Compliance:</strong> Vyntra requests a token directly from your issuing
                bank. Your full 16-digit number and CVV are never stored on our servers.
              </span>
            </div>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Issuing Bank</label>
                <select
                  value={newCardBank}
                  onChange={(e) => setNewCardBank(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F7F8F8] rounded-xl text-xs font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="Standard Chartered">Standard Chartered</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Card Nickname / Description</label>
                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="e.g. Regalia Gold / Millennia"
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Card Network</label>
                  <select
                    value={newCardNetwork}
                    onChange={(e) => setNewCardNetwork(e.target.value as any)}
                    className="w-full h-11 px-3 bg-[#F7F8F8] rounded-xl text-xs font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                  >
                    <option value="VISA">VISA</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="RuPay">RuPay</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newCardLast4}
                    onChange={(e) => setNewCardLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5124"
                    className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Cardholder Name (as on card)</label>
                <input
                  type="text"
                  value={newCardHolder}
                  onChange={(e) => setNewCardHolder(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Expiry Month</label>
                  <select
                    value={newCardExpMonth}
                    onChange={(e) => setNewCardExpMonth(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F7F8F8] rounded-xl text-xs font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Expiry Year</label>
                  <select
                    value={newCardExpYear}
                    onChange={(e) => setNewCardExpYear(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F7F8F8] rounded-xl text-xs font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                  >
                    {['25', '26', '27', '28', '29', '30', '31', '32'].map((y) => (
                      <option key={y} value={y}>
                        20{y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white hover:bg-[#004B57]"
                >
                  Tokenize &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: ADD NEW UPI */}
      {/* ============================================================= */}
      {upiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#FF9900]" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">Add New UPI ID</h3>
              </div>
              <button
                type="button"
                onClick={() => setUpiModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUpi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Preferred UPI App</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['GPay', 'PhonePe', 'Paytm', 'BHIM'] as const).map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => setNewUpiApp(app)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        newUpiApp === app
                          ? 'bg-[#007185] text-white border-[#007185]'
                          : 'bg-[#F7F8F8] text-[#0F1111] border-[#D5D9D9]'
                      }`}
                    >
                      {app}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">UPI ID / Virtual Payment Address</label>
                <input
                  type="text"
                  value={newUpiVpa}
                  onChange={(e) => setNewUpiVpa(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => setUpiModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white hover:bg-[#004B57]"
                >
                  Verify &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: LINK BANK ACCOUNT */}
      {/* ============================================================= */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#007185]" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">Link Bank Account for Refunds</h3>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#444653]">
              A ₹1 penny-drop validation will be executed by our banking partner to verify account title.
            </p>

            <form onSubmit={handleLinkBank} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => {
                    setNewBankName(e.target.value);
                    setNewBankShort(e.target.value.split(' ')[0]);
                  }}
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F1111] mb-1">Branch Location</label>
                <input
                  type="text"
                  value={newBankBranch}
                  onChange={(e) => setNewBankBranch(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newBankLast4}
                    onChange={(e) => setNewBankLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 8812"
                    className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F1111] mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={newBankIfsc}
                    onChange={(e) => setNewBankIfsc(e.target.value.toUpperCase())}
                    className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white uppercase font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white hover:bg-[#004B57]"
                >
                  Verify &amp; Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: TOP-UP / REDEEM VOUCHER */}
      {/* ============================================================= */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#FF9900]" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">Top-Up Vyntra Vault</h3>
              </div>
              <button
                type="button"
                onClick={() => setTopUpModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Redeem Gift Voucher */}
            <div className="p-4 bg-[#F7F8F8] rounded-xl space-y-2 border border-[#D5D9D9]">
              <span className="text-xs font-bold text-[#0F1111] block">Have a Gift Voucher or Promo Code?</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FESTIVE500"
                  className="flex-1 h-10 px-3 bg-white rounded-lg text-xs font-mono font-bold uppercase border border-[#D5D9D9]"
                />
                <button
                  type="button"
                  onClick={handleRedeemVoucher}
                  className="px-4 h-10 rounded-lg bg-[#FF9900] text-white text-xs font-bold hover:bg-[#904d00]"
                >
                  Redeem
                </button>
              </div>
              <span className="text-[10px] text-[#565959] block">Demo vouchers: FESTIVE500, VYNTRA1000</span>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#D5D9D9]" />
              <span className="flex-shrink mx-4 text-xs font-bold text-[#565959]">OR ADD CUSTOM LIQUIDITY</span>
              <div className="flex-grow border-t border-[#D5D9D9]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">Select Amount (INR)</label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setTopUpAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      topUpAmount === amt
                        ? 'bg-[#007185] text-white border-[#007185]'
                        : 'bg-[#F7F8F8] text-[#0F1111] border-[#D5D9D9]'
                    }`}
                  >
                    {formatINR(amt)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setTopUpModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bonus = Math.round(topUpAmount * 0.05);
                  store.topUpVault(topUpAmount, bonus);
                  showToast(
                    `Successfully added ${formatINR(topUpAmount)} + ${formatINR(bonus)} bonus to your Vault!`,
                    'success'
                  );
                  setTopUpModalOpen(false);
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white hover:bg-[#004B57]"
              >
                Top-Up {formatINR(topUpAmount)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 5: TRANSFER TO BANK ACCOUNT */}
      {/* ============================================================= */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#007185]" />
                <h3 className="font-headline font-bold text-base text-[#0F1111]">Transfer to Bank Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-[#F7F8F8] rounded-xl text-xs text-[#444653] border border-[#D5D9D9]">
              Withdrawable Cash Balance: <strong>{formatINR(store.storeCredits)}</strong> (Promotional Festive
              SuperCoins cannot be redeemed to bank).
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">Destination Bank Account</label>
              <select
                value={selectedTransferBankId}
                onChange={(e) => setSelectedTransferBankId(e.target.value)}
                className="w-full h-11 px-3 bg-[#F7F8F8] rounded-xl text-xs font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
              >
                {store.linkedBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.accountNumberMasked}) - {b.ifsc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">Transfer Amount (INR)</label>
              <input
                type="number"
                min={100}
                max={store.storeCredits}
                value={transferAmount}
                onChange={(e) => setTransferAmount(Number(e.target.value))}
                className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransferToBank}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white hover:bg-[#004B57]"
              >
                Confirm Instant IMPS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 6: DELETE / UNLINK CONFIRMATION */}
      {/* ============================================================= */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center gap-2 text-[#ba1a1a]">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-headline font-bold text-base text-[#0F1111]">Confirm Removal</h3>
            </div>
            <p className="text-xs text-[#444653]">
              Are you sure you want to remove <strong>{deleteConfirm.title}</strong>? You will need to re-authenticate
              to use this method again.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#ba1a1a] text-white hover:bg-[#93000a]"
              >
                Remove Method
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

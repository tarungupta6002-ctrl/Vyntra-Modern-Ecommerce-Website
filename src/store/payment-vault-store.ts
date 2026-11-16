import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCard {
  id: string;
  bankName: string;
  cardName: string;
  network: 'VISA' | 'Mastercard' | 'RuPay' | 'Amex';
  networkTier?: string; // Signature, Titanium, Select
  last4: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
  tokenizedBadge: string;
  gradientTheme: string;
}

export interface SavedUpi {
  id: string;
  app: 'GPay' | 'PhonePe' | 'Paytm' | 'BHIM' | 'Other';
  vpa: string;
  title: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface LinkedBankAccount {
  id: string;
  bankName: string;
  shortName: string;
  branch: string;
  accountNumberMasked: string;
  ifsc: string;
  isPrimaryRefund: boolean;
  isPennyDropVerified: boolean;
}

export interface VaultTransaction {
  id: string;
  title: string;
  referenceId: string;
  date: string;
  method: string;
  amount: number;
  type: 'credit' | 'debit' | 'swap';
  category: 'vault' | 'refund' | 'order' | 'bonus';
  status: 'Completed' | 'Refunded' | 'Successful' | 'Credited';
  statusNote?: string;
}

export interface PaymentPreferences {
  oneClickCheckout: boolean;
  autoApplyVaultBalance: boolean;
  internationalTransactions: boolean;
  biometricTwoFactor: boolean;
  autoTopUpEnabled: boolean;
  autoTopUpThreshold: number;
  autoTopUpAmount: number;
}

export interface PaymentVaultState {
  // Vault Liquidity
  totalLiquidity: number;
  storeCredits: number;
  cashbackBonus: number;
  superCoins: number;

  // Saved Payment Methods (Masked details only, zero CVV/PIN/full PAN)
  savedCards: SavedCard[];
  savedUpi: SavedUpi[];
  linkedBanks: LinkedBankAccount[];
  transactions: VaultTransaction[];
  preferences: PaymentPreferences;

  // Actions
  addSavedCard: (card: Omit<SavedCard, 'id'>) => void;
  removeSavedCard: (id: string) => void;
  setDefaultCard: (id: string) => void;

  addSavedUpi: (upi: Omit<SavedUpi, 'id'>) => void;
  removeSavedUpi: (id: string) => void;
  setDefaultUpi: (id: string) => void;

  addLinkedBank: (bank: Omit<LinkedBankAccount, 'id'>) => void;
  unlinkBank: (id: string) => void;

  topUpVault: (amount: number, bonus?: number) => void;
  redeemVoucher: (code: string) => { success: boolean; amount: number; message: string };
  transferToBank: (amount: number, bankId: string) => { success: boolean; message: string };

  togglePreference: (key: keyof PaymentPreferences) => void;
  toggleAutoTopUp: () => void;
}

const INITIAL_SAVED_CARDS: SavedCard[] = [
  {
    id: 'card-hdfc-4012',
    bankName: 'HDFC Bank',
    cardName: 'Regalia Gold',
    network: 'VISA',
    networkTier: 'Signature',
    last4: '4012',
    cardholderName: 'ARYA SHARMA',
    expiryMonth: '08',
    expiryYear: '28',
    isDefault: true,
    tokenizedBadge: 'RBI Tokenized',
    gradientTheme: 'from-[#283044] via-[#00288e] to-[#283044]',
  },
  {
    id: 'card-icici-8831',
    bankName: 'ICICI Bank',
    cardName: 'Emeralde Titanium',
    network: 'Mastercard',
    networkTier: 'Titanium',
    last4: '8831',
    cardholderName: 'ARYA SHARMA',
    expiryMonth: '11',
    expiryYear: '27',
    isDefault: false,
    tokenizedBadge: 'RBI Tokenized',
    gradientTheme: 'from-[#444653] via-[#283044] to-[#131b2e]',
  },
  {
    id: 'card-axis-1094',
    bankName: 'Axis Bank',
    cardName: 'Magnus Select',
    network: 'RuPay',
    networkTier: 'RuPay SELECT',
    last4: '1094',
    cardholderName: 'ARYA SHARMA',
    expiryMonth: '04',
    expiryYear: '29',
    isDefault: false,
    tokenizedBadge: 'RBI Tokenized',
    gradientTheme: 'from-[#0042b2] via-[#00288e] to-[#00174b]',
  },
];

const INITIAL_SAVED_UPI: SavedUpi[] = [
  {
    id: 'upi-gpay',
    app: 'GPay',
    vpa: 'aryasharma@okhdfcbank',
    title: 'Google Pay UPI',
    isDefault: true,
    isVerified: true,
  },
  {
    id: 'upi-phonepe',
    app: 'PhonePe',
    vpa: '9820198201@ybl',
    title: 'PhonePe UPI',
    isDefault: false,
    isVerified: true,
  },
  {
    id: 'upi-paytm',
    app: 'Paytm',
    vpa: 'arya.vyntra@paytm',
    title: 'Paytm Payments Bank',
    isDefault: false,
    isVerified: true,
  },
];

const INITIAL_LINKED_BANKS: LinkedBankAccount[] = [
  {
    id: 'bank-hdfc-5621',
    bankName: 'HDFC Bank Limited',
    shortName: 'HDFC',
    branch: 'Fort Branch, Mumbai',
    accountNumberMasked: '••••••••5621',
    ifsc: 'HDFC0000060',
    isPrimaryRefund: true,
    isPennyDropVerified: true,
  },
];

const INITIAL_TRANSACTIONS: VaultTransaction[] = [
  {
    id: 'tx-1',
    title: 'Size Exchange Compensation & Vault Credit',
    referenceId: '#EXC-91044-SWP',
    date: 'Nov 12, 2025',
    method: 'Vyntra Vault',
    amount: 0,
    type: 'swap',
    category: 'vault',
    status: 'Completed',
    statusNote: 'Zero Fee VIP Swap',
  },
  {
    id: 'tx-2',
    title: 'Banarasi Katan Silk Dupatta Instant Refund',
    referenceId: '#RET-77412',
    date: 'Oct 28, 2025',
    method: 'HDFC Visa (••4012) via IMPS',
    amount: 2499,
    type: 'credit',
    category: 'refund',
    status: 'Refunded',
    statusNote: 'Refunded in 12 mins',
  },
  {
    id: 'tx-3',
    title: 'Handcrafted Premium Linen Kurta Set Purchase',
    referenceId: '#VYN-ORD-88120',
    date: 'Oct 24, 2025',
    method: 'HDFC Visa (••4012) + ₹500 Vault Coins',
    amount: -3559,
    type: 'debit',
    category: 'order',
    status: 'Successful',
    statusNote: 'Paid in full',
  },
  {
    id: 'tx-4',
    title: 'Festive Vault Top-up & 10% Cashback Bonus Promo',
    referenceId: '#TOP-VAULT-2210',
    date: 'Sep 22, 2025',
    method: 'UPI (aryasharma@okhdfcbank)',
    amount: 5000,
    type: 'credit',
    category: 'bonus',
    status: 'Credited',
    statusNote: 'Bonus: +₹500',
  },
];

const INITIAL_PREFERENCES: PaymentPreferences = {
  oneClickCheckout: true,
  autoApplyVaultBalance: true,
  internationalTransactions: false,
  biometricTwoFactor: true,
  autoTopUpEnabled: false,
  autoTopUpThreshold: 500,
  autoTopUpAmount: 2000,
};

export const usePaymentVaultStore = create<PaymentVaultState>()(
  persist(
    (set, get) => ({
      totalLiquidity: 8450,
      storeCredits: 6200,
      cashbackBonus: 1750,
      superCoins: 500,

      savedCards: INITIAL_SAVED_CARDS,
      savedUpi: INITIAL_SAVED_UPI,
      linkedBanks: INITIAL_LINKED_BANKS,
      transactions: INITIAL_TRANSACTIONS,
      preferences: INITIAL_PREFERENCES,

      addSavedCard: (newCard) =>
        set((state) => {
          const cardId = `card-${Date.now()}`;
          const isFirst = state.savedCards.length === 0;
          const cardToAdd: SavedCard = {
            ...newCard,
            id: cardId,
            isDefault: newCard.isDefault || isFirst,
          };
          const updatedCards = cardToAdd.isDefault
            ? state.savedCards.map((c) => ({ ...c, isDefault: false }))
            : [...state.savedCards];

          return {
            savedCards: [cardToAdd, ...updatedCards],
          };
        }),

      removeSavedCard: (id) =>
        set((state) => {
          const filtered = state.savedCards.filter((c) => c.id !== id);
          if (filtered.length > 0 && !filtered.some((c) => c.isDefault)) {
            filtered[0].isDefault = true;
          }
          return { savedCards: filtered };
        }),

      setDefaultCard: (id) =>
        set((state) => ({
          savedCards: state.savedCards.map((c) => ({
            ...c,
            isDefault: c.id === id,
          })),
        })),

      addSavedUpi: (newUpi) =>
        set((state) => {
          const upiId = `upi-${Date.now()}`;
          const isFirst = state.savedUpi.length === 0;
          const upiToAdd: SavedUpi = {
            ...newUpi,
            id: upiId,
            isDefault: newUpi.isDefault || isFirst,
          };
          const updatedUpi = upiToAdd.isDefault
            ? state.savedUpi.map((u) => ({ ...u, isDefault: false }))
            : [...state.savedUpi];

          return {
            savedUpi: [upiToAdd, ...updatedUpi],
          };
        }),

      removeSavedUpi: (id) =>
        set((state) => {
          const filtered = state.savedUpi.filter((u) => u.id !== id);
          if (filtered.length > 0 && !filtered.some((u) => u.isDefault)) {
            filtered[0].isDefault = true;
          }
          return { savedUpi: filtered };
        }),

      setDefaultUpi: (id) =>
        set((state) => ({
          savedUpi: state.savedUpi.map((u) => ({
            ...u,
            isDefault: u.id === id,
          })),
        })),

      addLinkedBank: (newBank) =>
        set((state) => ({
          linkedBanks: [
            ...state.linkedBanks,
            { ...newBank, id: `bank-${Date.now()}` },
          ],
        })),

      unlinkBank: (id) =>
        set((state) => ({
          linkedBanks: state.linkedBanks.filter((b) => b.id !== id),
        })),

      topUpVault: (amount, bonus = 0) =>
        set((state) => {
          const addedAmount = amount + bonus;
          const newTotal = state.totalLiquidity + addedAmount;
          const newCashback = state.cashbackBonus + bonus;
          const newStoreCredits = state.storeCredits + amount;
          const newTx: VaultTransaction = {
            id: `tx-${Date.now()}`,
            title: `Vault Top-up${bonus > 0 ? ' with Festive Bonus' : ''}`,
            referenceId: `#TOP-VYN-${Math.floor(1000 + Math.random() * 9000)}`,
            date: 'Today',
            method: 'Instant UPI / Linked Bank',
            amount: addedAmount,
            type: 'credit',
            category: bonus > 0 ? 'bonus' : 'vault',
            status: 'Credited',
            statusNote: bonus > 0 ? `Bonus: +₹${bonus}` : 'Instant Credit',
          };
          return {
            totalLiquidity: newTotal,
            storeCredits: newStoreCredits,
            cashbackBonus: newCashback,
            transactions: [newTx, ...state.transactions],
          };
        }),

      redeemVoucher: (code) => {
        const cleanCode = code.trim().toUpperCase();
        if (cleanCode === 'FESTIVE500' || cleanCode === 'ROYAL500') {
          get().topUpVault(500, 50);
          return {
            success: true,
            amount: 550,
            message: '₹500 Gift Voucher + ₹50 Festive Bonus redeemed to Vault!',
          };
        }
        if (cleanCode === 'VYNTRA1000' || cleanCode === 'LUXURY1000') {
          get().topUpVault(1000, 100);
          return {
            success: true,
            amount: 1100,
            message: '₹1,000 Voucher + ₹100 Royal Perk redeemed to Vault!',
          };
        }
        return {
          success: false,
          amount: 0,
          message: 'Invalid or expired voucher code. Try FESTIVE500 or VYNTRA1000.',
        };
      },

      transferToBank: (amount, bankId) => {
        const state = get();
        if (amount > state.storeCredits) {
          return {
            success: false,
            message: `Max withdrawable cash credit is ₹${state.storeCredits.toLocaleString('en-IN')}. Promotional bonus coins cannot be transferred.`,
          };
        }
        const targetBank = state.linkedBanks.find((b) => b.id === bankId) || state.linkedBanks[0];
        const newTotal = state.totalLiquidity - amount;
        const newCredits = state.storeCredits - amount;
        const newTx: VaultTransaction = {
          id: `tx-${Date.now()}`,
          title: `Direct IMPS Transfer to ${targetBank?.shortName || 'Bank'}`,
          referenceId: `#IMPS-TX-${Math.floor(10000 + Math.random() * 90000)}`,
          date: 'Today',
          method: `${targetBank?.bankName || 'Bank'} (${targetBank?.accountNumberMasked || '••••5621'})`,
          amount: -amount,
          type: 'debit',
          category: 'vault',
          status: 'Successful',
          statusNote: 'IMPS 15-Minute Settlement',
        };

        set({
          totalLiquidity: newTotal,
          storeCredits: newCredits,
          transactions: [newTx, ...state.transactions],
        });

        return {
          success: true,
          message: `₹${amount.toLocaleString('en-IN')} transferred via Instant IMPS to ${targetBank?.bankName}.`,
        };
      },

      togglePreference: (key) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: !state.preferences[key],
          },
        })),

      toggleAutoTopUp: () =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            autoTopUpEnabled: !state.preferences.autoTopUpEnabled,
          },
        })),
    }),
    {
      name: 'vyntra-payment-vault-v1',
      // Safe storage: Masked info only. Zero CVV, passwords, full PAN, or auth tokens.
      partialize: (state) => ({
        totalLiquidity: state.totalLiquidity,
        storeCredits: state.storeCredits,
        cashbackBonus: state.cashbackBonus,
        superCoins: state.superCoins,
        savedCards: state.savedCards,
        savedUpi: state.savedUpi,
        linkedBanks: state.linkedBanks,
        preferences: state.preferences,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface NotificationMatrix {
  orderLogistics: { whatsapp: boolean; sms: boolean; email: boolean; push: boolean };
  festiveDrops: { whatsapp: boolean; sms: boolean; email: boolean; push: boolean };
  vaultAlerts: { whatsapp: boolean; sms: boolean; email: boolean; push: boolean };
  editorialNotes: { whatsapp: boolean; sms: boolean; email: boolean; push: boolean };
}

export interface UserProfileState {
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';
  avatar: string;
  displayLanguage: string;
  billingCurrency: string;
  tier: string;
  memberId: string;
  memberSince: string;
  vaultCoins: number;
  rankStatus: string;
  twoFactorEnabled: boolean;
  securityScore: number;
  lastPasswordChange: string;
  lastMasterSync: string;
  sessions: ActiveSession[];
  notifications: NotificationMatrix;

  // Actions
  updateProfile: (data: Partial<UserProfileState>) => void;
  setTwoFactor: (enabled: boolean) => void;
  updateNotification: (
    topic: keyof NotificationMatrix,
    channel: 'whatsapp' | 'sms' | 'email' | 'push',
    value: boolean
  ) => void;
  revokeSession: (sessionId: string) => void;
  logoutAllOtherSessions: () => void;
  setAvatar: (avatarUrl: string) => void;
  removeAvatar: () => void;
  resetToDefault: () => void;
}

export const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCy9UXEJ9ND4J5RQAT7tPpKAKExkxpXfzQ4JTPgbJjwzcx_UgeYtkw5i1J_VNwQwnztqIxC0dXFKKRenVb3rchyRp2cgMaSE1HkA0s1i6XeNsMJ2zKf1tIskfMJiQM6DtZ8227vOgmEczQx7oVW49jpFh9Q4Lu6aerzO-Jiwomcb1OgmIJsLP_y6ciEKwTSiwEE3s-QLk8ezDwKJQT_pf9FcooF0bGEtn9shta3Tb0';

const INITIAL_SESSIONS: ActiveSession[] = [
  {
    id: 'sess-curr',
    device: 'MacBook Pro / Desktop',
    browser: 'Chrome 122',
    os: 'macOS Sonoma',
    location: 'Bengaluru, India',
    ip: '49.207.214.12',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess-ios',
    device: 'iPhone 15 Pro',
    browser: 'VYNTRA iOS App v3.4',
    os: 'iOS 17.4',
    location: 'Bengaluru, India',
    ip: '49.207.214.88',
    lastActive: '4 hours ago',
    isCurrent: false,
  },
];

const INITIAL_NOTIFICATIONS: NotificationMatrix = {
  orderLogistics: { whatsapp: true, sms: true, email: true, push: true },
  festiveDrops: { whatsapp: true, sms: false, email: true, push: true },
  vaultAlerts: { whatsapp: false, sms: false, email: true, push: true },
  editorialNotes: { whatsapp: false, sms: false, email: true, push: false },
};

const DEFAULT_PROFILE_DATA = {
  fullName: 'Patron',
  email: 'patron@vyntra.luxury',
  phone: '',
  dob: '1995-01-01',
  gender: 'female' as const,
  avatar: DEFAULT_AVATAR,
  displayLanguage: 'English (India) - Preferred',
  billingCurrency: 'INR (₹) - Indian Rupee',
  tier: 'Royal Gold Tier',
  memberId: '#VYN-MB-99214',
  memberSince: 'Oct 2023',
  vaultCoins: 850,
  rankStatus: 'Top 2% VIP',
  twoFactorEnabled: true,
  securityScore: 92,
  lastPasswordChange: '42 days ago',
  lastMasterSync: '2 minutes ago',
  sessions: INITIAL_SESSIONS,
  notifications: INITIAL_NOTIFICATIONS,
};

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PROFILE_DATA,

      updateProfile: (data) =>
        set((state) => ({
          ...state,
          ...data,
          lastMasterSync: 'Just now',
        })),

      setTwoFactor: (enabled) =>
        set((state) => ({
          ...state,
          twoFactorEnabled: enabled,
          securityScore: enabled ? 92 : 74,
          lastMasterSync: 'Just now',
        })),

      updateNotification: (topic, channel, value) =>
        set((state) => ({
          ...state,
          notifications: {
            ...state.notifications,
            [topic]: {
              ...state.notifications[topic],
              [channel]: value,
            },
          },
          lastMasterSync: 'Just now',
        })),

      revokeSession: (sessionId) =>
        set((state) => ({
          ...state,
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          lastMasterSync: 'Just now',
        })),

      logoutAllOtherSessions: () =>
        set((state) => ({
          ...state,
          sessions: state.sessions.filter((s) => s.isCurrent),
          lastMasterSync: 'Just now',
        })),

      setAvatar: (avatarUrl) =>
        set((state) => ({
          ...state,
          avatar: avatarUrl,
          lastMasterSync: 'Just now',
        })),

      removeAvatar: () =>
        set((state) => ({
          ...state,
          avatar: '',
          lastMasterSync: 'Just now',
        })),

      resetToDefault: () =>
        set(() => ({
          ...DEFAULT_PROFILE_DATA,
        })),
    }),
    {
      name: 'vyntra-user-profile-v2',
      // Note: Never storing passwords or tokens here per security guidelines
      partialize: (state) => ({
        fullName: state.fullName,
        email: state.email,
        phone: state.phone,
        dob: state.dob,
        gender: state.gender,
        avatar: state.avatar,
        displayLanguage: state.displayLanguage,
        billingCurrency: state.billingCurrency,
        twoFactorEnabled: state.twoFactorEnabled,
        notifications: state.notifications,
      }),
    }
  )
);

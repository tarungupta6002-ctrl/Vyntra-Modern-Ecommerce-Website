import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Client-side cache of the signed-in user's basic details, so the header and forms
 * can show a name before the server responds. The account itself (and the source of
 * truth) lives in the database; see /api/account/profile.
 */
export interface UserProfileState {
  fullName: string;
  email: string;
  phone: string;
  updateProfile: (data: Partial<Pick<UserProfileState, 'fullName' | 'email' | 'phone'>>) => void;
  resetToDefault: () => void;
}

const EMPTY_PROFILE = { fullName: '', email: '', phone: '' };

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      ...EMPTY_PROFILE,
      updateProfile: (data) =>
        set((state) => ({
          fullName: data.fullName ?? state.fullName,
          email: data.email ?? state.email,
          phone: data.phone ?? state.phone,
        })),
      resetToDefault: () => set(() => ({ ...EMPTY_PROFILE })),
    }),
    {
      // v3 drops the old demo fields (tier, coins, sessions, 2FA) that v2 stored.
      name: 'vyntra-user-profile-v3',
      partialize: (state) => ({ fullName: state.fullName, email: state.email, phone: state.phone }),
    }
  )
);

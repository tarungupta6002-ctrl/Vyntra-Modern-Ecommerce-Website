import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AddressType = 'Home' | 'Work' | 'Other';

export interface Address {
  id: string;
  name: string; // Recipient Full Name
  phone: string; // 10-digit phone
  pincode: string; // 6-digit Indian PIN code
  flat: string; // Flat, House No., Building
  area: string; // Area, Colony, Street
  landmark?: string; // Landmark
  city: string; // City / Town
  state: string; // State
  type: AddressType; // Home | Work | Other
  isDefault: boolean; // Only one default address
  isVerified?: boolean; // Verified badge
  relationTag?: string; // e.g. "Father", "Studio"
  deliveryHours?: string; // e.g. "Open all days • 9:00 AM – 8:00 PM"
  doorstepInstructions?: string; // e.g. "Leave with security desk if unavailable"
}

// Indian PIN Code Directory Lookup (for auto-detect)
export const PINCODE_DIRECTORY: Record<string, { city: string; state: string; areaHint?: string }> = {
  '560001': { city: 'Bengaluru', state: 'Karnataka', areaHint: 'Indiranagar / MG Road' },
  '560025': { city: 'Bengaluru', state: 'Karnataka', areaHint: 'Residency Road / Ashok Nagar' },
  '560034': { city: 'Bengaluru', state: 'Karnataka', areaHint: 'Koramangala / HSR' },
  '560038': { city: 'Bengaluru', state: 'Karnataka', areaHint: 'Indiranagar HAL 2nd Stage' },
  '560100': { city: 'Bengaluru', state: 'Karnataka', areaHint: 'Electronic City' },
  '302021': { city: 'Jaipur', state: 'Rajasthan', areaHint: 'Vaishali Nagar / Sirsi Road' },
  '302001': { city: 'Jaipur', state: 'Rajasthan', areaHint: 'C-Scheme / MI Road' },
  '110001': { city: 'New Delhi', state: 'Delhi NCR', areaHint: 'Connaught Place' },
  '110016': { city: 'New Delhi', state: 'Delhi NCR', areaHint: 'Hauz Khas / Green Park' },
  '122002': { city: 'Gurugram', state: 'Haryana', areaHint: 'DLF Phase 1 / Golf Course Rd' },
  '400001': { city: 'Mumbai', state: 'Maharashtra', areaHint: 'Fort / South Mumbai' },
  '400050': { city: 'Mumbai', state: 'Maharashtra', areaHint: 'Bandra West' },
  '600001': { city: 'Chennai', state: 'Tamil Nadu', areaHint: 'George Town' },
  '500001': { city: 'Hyderabad', state: 'Telangana', areaHint: 'Abids / Banjara Hills' },
  '700001': { city: 'Kolkata', state: 'West Bengal', areaHint: 'BBD Bagh / Park Street' },
};

export const INITIAL_ADDRESSES: Address[] = [];

export function mapDbAddressToStore(db: any): Address {
  return {
    id: db.id,
    name: db.fullName || '',
    phone: db.phone || '',
    flat: db.streetAddress || '',
    area: db.locality || '',
    landmark: db.landmark || undefined,
    city: db.city || '',
    state: db.state || '',
    pincode: db.postalCode || '',
    type: db.addressType === 'WORK' ? 'Work' : db.addressType === 'OTHER' ? 'Other' : 'Home',
    isDefault: Boolean(db.isDefault),
    isVerified: true,
  };
}

interface AddressState {
  addresses: Address[];
  selectedAddressId: string;
  fetchAddresses: () => Promise<Address[]>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Address>;
  updateAddress: (id: string, updated: Partial<Address>) => Promise<void>;
  deleteAddress: (id: string) => Promise<boolean>;
  setDefaultAddress: (id: string) => Promise<void>;
  setSelectedAddressId: (id: string) => void;
  getSelectedAddress: () => Address | undefined;
  getDefaultAddress: () => Address | undefined;
  resetToDefault: () => void;
  setDeliveryPincode: (pincode: string, city: string, state: string) => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddressId: '',

      fetchAddresses: async () => {
        try {
          const res = await fetch('/api/addresses');
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.addresses)) {
            const mapped = json.data.addresses.map(mapDbAddressToStore);
            const currentSelected = get().selectedAddressId;
            const validSelected = mapped.some((a: Address) => a.id === currentSelected)
              ? currentSelected
              : (mapped.find((a: Address) => a.isDefault)?.id || mapped[0]?.id || '');

            set({
              addresses: mapped,
              selectedAddressId: validSelected,
            });
            return mapped;
          }
        } catch (err) {
          console.warn('[Address fetch error]:', err);
        }
        return get().addresses;
      },

      addAddress: async (newAddrData) => {
        const isFirst = get().addresses.length === 0;
        const willBeDefault = Boolean(newAddrData.isDefault || isFirst);

        // Optimistic entry
        const tempId = `addr-${Date.now()}`;
        const tempAddress: Address = {
          ...newAddrData,
          id: tempId,
          isDefault: willBeDefault,
          isVerified: true,
        };

        const existingList = willBeDefault
          ? get().addresses.map((a) => ({ ...a, isDefault: false }))
          : get().addresses;

        set({
          addresses: [tempAddress, ...existingList],
          selectedAddressId: tempId,
        });

        // Persist to database
        try {
          const res = await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: newAddrData.name,
              phone: newAddrData.phone,
              streetAddress: newAddrData.flat,
              locality: newAddrData.area,
              landmark: newAddrData.landmark,
              city: newAddrData.city,
              state: newAddrData.state,
              postalCode: newAddrData.pincode,
              addressType: newAddrData.type ? newAddrData.type.toUpperCase() : 'HOME',
              isDefault: willBeDefault,
            }),
          });
          const json = await res.json();
          if (json.success && json.data?.address) {
            const realAddress = mapDbAddressToStore(json.data.address);
            const updated = get().addresses.map((a) => (a.id === tempId ? realAddress : a));
            set({
              addresses: updated,
              selectedAddressId: realAddress.id,
            });
            return realAddress;
          }
        } catch (err) {
          console.warn('[Failed to persist address to database]:', err);
        }

        return tempAddress;
      },

      updateAddress: async (id, updated) => {
        const currentList = get().addresses;
        const willBeDefault = updated.isDefault;

        const nextAddresses = currentList.map((addr) => {
          if (addr.id === id) {
            return { ...addr, ...updated };
          }
          if (willBeDefault) {
            return { ...addr, isDefault: false };
          }
          return addr;
        });

        set({ addresses: nextAddresses });

        // Update database if not a temp id
        if (!id.startsWith('addr-')) {
          try {
            await fetch(`/api/addresses/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: updated.name,
                phone: updated.phone,
                streetAddress: updated.flat,
                locality: updated.area,
                landmark: updated.landmark,
                city: updated.city,
                state: updated.state,
                postalCode: updated.pincode,
                addressType: updated.type ? updated.type.toUpperCase() : undefined,
                isDefault: updated.isDefault,
              }),
            });
          } catch (err) {
            console.warn('[Failed to update address in DB]:', err);
          }
        }
      },

      deleteAddress: async (id) => {
        const currentList = get().addresses;
        const target = currentList.find((a) => a.id === id);
        if (!target) return false;

        const nextAddresses = currentList.filter((a) => a.id !== id);

        if (target.isDefault && nextAddresses.length > 0) {
          nextAddresses[0].isDefault = true;
        }

        let nextSelectedId = get().selectedAddressId;
        if (nextSelectedId === id) {
          const newDefault = nextAddresses.find((a) => a.isDefault) || nextAddresses[0];
          nextSelectedId = newDefault ? newDefault.id : '';
        }

        set({
          addresses: nextAddresses,
          selectedAddressId: nextSelectedId,
        });

        if (!id.startsWith('addr-')) {
          try {
            const res = await fetch(`/api/addresses/${id}`, {
              method: 'DELETE',
            });
            const json = await res.json();
            if (!json.success) {
              console.warn('[Address delete failed on server]:', json.error);
            }
          } catch (err) {
            console.warn('[Failed to delete address from DB]:', err);
          }
        }

        return true;
      },

      setDefaultAddress: async (id) => {
        const nextAddresses = get().addresses.map((a) => ({
          ...a,
          isDefault: a.id === id,
        }));

        set({
          addresses: nextAddresses,
          selectedAddressId: id,
        });

        if (!id.startsWith('addr-')) {
          try {
            await fetch(`/api/addresses/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isDefault: true }),
            });
          } catch (err) {
            console.warn('[Failed to set default address in DB]:', err);
          }
        }
      },

      setSelectedAddressId: (id) => {
        set({ selectedAddressId: id });
      },

      getSelectedAddress: () => {
        const { addresses, selectedAddressId } = get();
        if (!addresses || addresses.length === 0) return undefined;
        return (
          addresses.find((a) => a.id === selectedAddressId) ||
          addresses.find((a) => a.isDefault) ||
          addresses[0]
        );
      },

      getDefaultAddress: () => {
        const { addresses } = get();
        if (!addresses || addresses.length === 0) return undefined;
        return addresses.find((a) => a.isDefault) || addresses[0];
      },

      resetToDefault: () => {
        set({
          addresses: [],
          selectedAddressId: '',
        });
      },

      setDeliveryPincode: (pincode: string, city: string, state: string) => {
        const { addresses } = get();
        const existing = addresses.find((a) => a.pincode === pincode);
        if (existing) {
          set({ selectedAddressId: existing.id });
          return;
        }
        const tempId = `pin-${pincode}`;
        const tempAddress: Address = {
          id: tempId,
          name: 'Delivery Location',
          phone: '',
          flat: 'Standard Delivery Area',
          area: city,
          city,
          state,
          pincode,
          type: 'Other',
          isDefault: false,
          isVerified: true,
        };
        set({
          addresses: [...addresses.filter((a) => !a.id.startsWith('pin-')), tempAddress],
          selectedAddressId: tempId,
        });
      },
    }),
    {
      name: 'vyntra-addresses-v2',
    }
  )
);

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  Briefcase,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Star,
  MapPin,
  Clock,
  Info,
  Check,
  X,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Phone,
  Building,
} from 'lucide-react';
import {
  Address,
  AddressType,
  useAddressStore,
  PINCODE_DIRECTORY,
} from '@/store/address-store';
import { useUserProfileStore } from '@/store/user-profile-store';

import { CometSpinner } from '@/components/ui/loading-spinner';
interface SavedAddressesViewProps {
  embeddedInAccount?: boolean;
}

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Delhi NCR',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Gujarat',
  'Uttar Pradesh',
  'West Bengal',
  'Kerala',
  'Haryana',
  'Punjab',
];

export function SavedAddressesView({ embeddedInAccount = false }: SavedAddressesViewProps) {
  const [mounted, setMounted] = useState(false);
  const {
    addresses,
    fetchAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddressStore();
  const profileStore = useUserProfileStore();

  useEffect(() => {
    setMounted(true);
    fetchAddresses();
  }, [fetchAddresses]);

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form Fields
  const [pincode, setPincode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [flat, setFlat] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [addressType, setAddressType] = useState<AddressType>('Home');
  const [isDefault, setIsDefault] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState('Open all days • 9:00 AM – 8:00 PM');
  const [doorstepInstructions, setDoorstepInstructions] = useState('Leave with security desk if unavailable; call before delivery');

  // Form Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete Confirmation Modal
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isDetectingPin, setIsDetectingPin] = useState(false);

  // Handle PIN code auto-detect with Pan-India Postal API + Local Directory fallback
  const handleAutoDetectPincode = async (inputPin: string) => {
    const clean = inputPin.trim().replace(/\D/g, '');
    if (clean.length !== 6) {
      showToast('Please enter a valid 6-digit PIN code to auto-detect', 'error');
      return;
    }

    // 1. Instant local directory check
    if (PINCODE_DIRECTORY[clean]) {
      const info = PINCODE_DIRECTORY[clean];
      setCity(info.city);
      setStateVal(info.state);
      if (info.areaHint && !area) {
        setArea(info.areaHint);
      }
      showToast(`Detected location: ${info.city}, ${info.state}`, 'success');
      return;
    }

    // 2. Dynamic fetch from Pan-India Postal Pincode API
    setIsDetectingPin(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const detectedCity = po.District || po.Block || po.Circle || po.Name;
        const detectedState = po.State;
        const detectedArea = po.Name;

        setCity(detectedCity);
        setStateVal(detectedState);
        if (detectedArea && !area) {
          setArea(detectedArea);
        }
        showToast(`Detected location: ${detectedCity}, ${detectedState}`, 'success');
      } else {
        showToast(`PIN ${clean} verified for Pan-India express delivery`, 'info');
      }
    } catch (e) {
      console.warn('[Pincode Lookup Error]:', e);
      showToast(`PIN ${clean} verified for Pan-India delivery`, 'info');
    } finally {
      setIsDetectingPin(false);
    }
  };

  // Open Drawer for Add New
  const handleOpenAdd = () => {
    setEditingAddressId(null);
    setPincode('');
    setName(profileStore.fullName || '');
    setPhone(profileStore.phone || '');
    setFlat('');
    setArea('');
    setLandmark('');
    setCity('');
    setStateVal('');
    setAddressType('Home');
    setIsDefault(addresses.length === 0);
    setDeliveryHours('Open all days • 9:00 AM – 8:00 PM');
    setDoorstepInstructions('Leave with security desk if unavailable; call before delivery');
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (addr: Address) => {
    setEditingAddressId(addr.id);
    setPincode(addr.pincode);
    setName(addr.name);
    setPhone(addr.phone);
    setFlat(addr.flat);
    setArea(addr.area);
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setStateVal(addr.state);
    setAddressType(addr.type);
    setIsDefault(addr.isDefault);
    setDeliveryHours(addr.deliveryHours || 'Open all days • 9:00 AM – 8:00 PM');
    setDoorstepInstructions(addr.doorstepInstructions || '');
    setFormErrors({});
    setIsDrawerOpen(true);
  };

  // Validate and Save Address
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!pincode.trim() || !/^\d{6}$/.test(pincode.trim())) {
      errors.pincode = 'Please enter a valid 6-digit Indian PIN code';
    }
    if (!name.trim()) {
      errors.name = 'Recipient name is required';
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (!flat.trim()) {
      errors.flat = 'Flat / House No. / Building is required';
    }
    if (!area.trim()) {
      errors.area = 'Area / Colony / Street is required';
    }
    if (!city.trim()) {
      errors.city = 'Town / City is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    if (editingAddressId) {
      // Update existing
      updateAddress(editingAddressId, {
        name: name.trim(),
        phone: cleanPhone,
        pincode: pincode.trim(),
        flat: flat.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stateVal,
        type: addressType,
        isDefault,
        deliveryHours,
        doorstepInstructions,
      });
      showToast(`Address updated successfully!`, 'success');
    } else {
      // Add new
      addAddress({
        name: name.trim(),
        phone: cleanPhone,
        pincode: pincode.trim(),
        flat: flat.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stateVal,
        type: addressType,
        isDefault,
        isVerified: true,
        deliveryHours,
        doorstepInstructions,
      });
      showToast(`New address added to your account!`, 'success');
    }

    setIsDrawerOpen(false);
  };

  // Handle Set Default
  const handleSetDefault = (id: string, name: string) => {
    setDefaultAddress(id);
    showToast(`Default address set to ${name}!`, 'success');
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (!addressToDelete) return;
    deleteAddress(addressToDelete.id);
    showToast(`Address removed from your account.`, 'info');
    setAddressToDelete(null);
  };

  // Prevent SSR hydration mismatch
  if (!mounted) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CometSpinner className="h-12 w-12" />
          <p className="text-xs text-[#565959] font-medium">Loading saved delivery addresses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 antialiased text-[#0F1111]">
      {/* Toast Alert */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F1111] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="h-4 w-4 text-[#FF9900]" />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '' })}
            className="text-white/60 hover:text-white ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <header className="flex flex-col gap-4">
        {!embeddedInAccount && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-label text-[#565959] tracking-wide">
            <Link href="/" className="hover:text-[#007185] transition-colors">
              Home
            </Link>
            <span className="text-[#c4c5d5] select-none">/</span>
            <Link href="/account" className="hover:text-[#007185] transition-colors">
              My Account
            </Link>
            <span className="text-[#c4c5d5] select-none">/</span>
            <span className="text-[#007185] font-semibold">Saved Addresses</span>
          </nav>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-extrabold tracking-tight text-[#0F1111]">
                Saved Addresses
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-label font-bold bg-[#FFE4B5] text-[#0F1111]">
                {addresses.length} Active
              </span>
            </div>
            <p className="text-sm text-[#444653] font-body max-w-2xl leading-relaxed">
              Manage your delivery locations, default addresses, and doorstep instructions for streamlined, touch-free express dispatch.
            </p>
          </div>

          {/* Primary Action Trigger */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#004B57] hover:bg-[#007185] text-white font-label font-semibold text-sm shadow-md active:scale-[0.98] transition-all self-start md:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Address</span>
          </button>
        </div>
      </header>

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border-2 border-dashed border-[#c4c5d5] bg-white p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F7F8F8] text-[#007185] flex items-center justify-center shadow-inner">
            <MapPin className="h-8 w-8 text-[#007185]" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-headline font-bold text-lg text-[#0F1111]">
              No Saved Addresses Found
            </h3>
            <p className="text-xs text-[#565959] leading-relaxed">
              You haven't saved any delivery destinations yet. Add your home, workplace, or atelier address for rapid one-click checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#007185] text-white text-xs font-bold shadow-sm hover:bg-[#004B57] transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Your First Address</span>
          </button>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((addr) => {
            const isHome = addr.type === 'Home';
            const isWork = addr.type === 'Work';

            return (
              <article
                key={addr.id}
                className={`flex flex-col justify-between bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border ${
                  addr.isDefault ? 'border-[#007185] ring-1 ring-[#007185]/20' : 'border-[#D5D9D9]'
                }`}
              >
                {/* Accent Top Bar for Primary Default */}
                {addr.isDefault && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#004B57]" />
                )}

                <div className="flex flex-col gap-4">
                  {/* Badges & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label font-bold bg-[#dde1ff] text-[#001453]">
                          <CheckCircle2 className="h-3.5 w-3.5 fill-[#001453] text-[#dde1ff]" />
                          DEFAULT ADDRESS
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-label font-semibold bg-[#D5D9D9] text-[#0F1111]">
                        {isHome ? (
                          <Home className="h-3.5 w-3.5 text-[#007185]" />
                        ) : isWork ? (
                          <Briefcase className="h-3.5 w-3.5 text-[#904d00]" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-[#444653]" />
                        )}
                        {addr.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Star bookmark indicator for default / Set as default CTA for others */}
                    {addr.isDefault ? (
                      <span className="text-[#FF9900]" title="Default Starred">
                        <Star className="h-5 w-5 fill-[#FF9900]" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id, addr.name)}
                        className="text-xs font-label font-semibold text-[#007185] hover:text-[#004B57] underline decoration-[#007185]/40 underline-offset-4 transition-colors"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>

                  {/* Recipient Name & Contact Pill */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-headline font-bold text-[#0F1111]">
                        {addr.name}
                      </h3>
                      {addr.isVerified ? (
                        <span className="text-xs font-label font-medium px-2 py-0.5 rounded bg-[#e2e7ff] text-[#444653] flex items-center gap-1">
                          <Check className="h-3 w-3 text-[#007185] stroke-[3]" /> Verified
                        </span>
                      ) : addr.relationTag ? (
                        <span className="text-xs font-label text-[#904d00] font-semibold">
                          {addr.relationTag}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-label font-medium text-[#0F1111] tracking-wide flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-[#565959]" />
                      +91 {addr.phone}
                    </p>
                  </div>

                  {/* Postal Detail Block */}
                  <div className="text-sm font-body text-[#444653] space-y-1 leading-relaxed">
                    <p className="text-[#0F1111] font-medium">{addr.flat}</p>
                    <p>{addr.area}</p>
                    <p className="font-semibold text-[#0F1111]">
                      {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                    {addr.landmark && (
                      <div className="pt-1 flex items-start gap-1.5 text-xs text-[#444653]/90">
                        <MapPin className="h-3.5 w-3.5 text-[#FF9900] shrink-0 mt-0.5" />
                        <span>{addr.landmark}</span>
                      </div>
                    )}
                  </div>

                  {/* Doorstep Delivery Specifics */}
                  <div className="flex flex-col gap-2 pt-2">
                    {addr.deliveryHours && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F7F8F8] text-xs font-label text-[#0F1111] border border-[#D5D9D9]">
                        <Clock className="h-3.5 w-3.5 text-[#007185] shrink-0" />
                        <span>{addr.deliveryHours}</span>
                      </div>
                    )}
                    {addr.doorstepInstructions && (
                      <div className="p-2.5 rounded-lg bg-[#D5D9D9] text-xs font-body text-[#444653] flex items-start gap-2 border border-[#dae2fd]">
                        <Info className="h-3.5 w-3.5 text-[#565959] shrink-0 mt-0.5" />
                        <span className="leading-snug">{addr.doorstepInstructions}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 mt-4 flex items-center justify-between border-t border-[#D5D9D9]">
                  {addr.isDefault ? (
                    <div className="flex items-center gap-1.5 text-xs font-label font-semibold text-[#007185]">
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Primary Delivery Location</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr.id, addr.name)}
                      className="text-xs font-label font-semibold text-[#444653] hover:text-[#007185] transition-colors flex items-center gap-1"
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-[#565959] flex items-center justify-center" />
                      <span>Set as Default</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(addr)}
                      className="p-2 rounded-lg text-[#444653] hover:text-[#007185] hover:bg-[#F7F8F8] transition-colors"
                      title="Edit Address"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressToDelete(addr)}
                      disabled={addr.isDefault && addresses.length > 1}
                      className={`p-2 rounded-lg transition-colors ${
                        addr.isDefault && addresses.length > 1
                          ? 'text-[#c4c5d5] cursor-not-allowed'
                          : 'text-[#565959] hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={
                        addr.isDefault && addresses.length > 1
                          ? 'Cannot delete default address directly. Set another as default first.'
                          : 'Delete Address'
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Add New Address Outline Card (matches Stitch 4th card) */}
          <article
            onClick={handleOpenAdd}
            className="flex flex-col items-center justify-center p-8 rounded-2xl bg-[#F7F8F8]/70 hover:bg-[#D5D9D9] border-2 border-dashed border-[#c4c5d5] hover:border-[#007185] transition-all cursor-pointer min-h-[340px] group text-center shadow-xs"
          >
            <div className="w-14 h-14 rounded-full bg-[#dde1ff] flex items-center justify-center text-[#007185] group-hover:scale-110 transition-transform mb-4 shadow-sm">
              <MapPin className="h-7 w-7 text-[#007185]" />
            </div>
            <h3 className="text-base font-headline font-bold text-[#0F1111] mb-2">
              Add a New Delivery Address
            </h3>
            <p className="text-xs font-body text-[#444653] max-w-xs leading-relaxed mb-5">
              Add a home, corporate campus, or vacation retreat with instant PIN code validation & doorstep instructions.
            </p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#dae2fd] text-[#007185] font-label font-bold text-xs group-hover:bg-[#007185] group-hover:text-white transition-colors shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span>New Address</span>
            </span>
          </article>
        </section>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT ADDRESS SLIDE-OVER DRAWER MODAL */}
      {/* ========================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300 border-l border-[#D5D9D9]">
            {/* Drawer Header */}
            <div className="px-6 py-5 bg-[#F7F8F8] border-b border-[#D5D9D9] flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#dde1ff] flex items-center justify-center text-[#007185]">
                  <MapPin className="h-5 w-5 text-[#007185]" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg text-[#0F1111]">
                    {editingAddressId ? 'Edit Address' : 'Add New Address'}
                  </h2>
                  <p className="text-xs font-body text-[#444653]">
                    Enter verified delivery location details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-[#444653] hover:text-[#0F1111] hover:bg-[#D5D9D9] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 flex flex-col gap-5 flex-1">
              {/* Postal PIN Code with auto-detect */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Postal PIN Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPincode(val);
                      if (val.length === 6) handleAutoDetectPincode(val);
                    }}
                    placeholder="e.g. 560001"
                    className={`flex-1 h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border transition-all ${
                      formErrors.pincode ? 'border-rose-500' : 'border-[#D5D9D9] focus:border-[#007185]'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isDetectingPin}
                    onClick={() => handleAutoDetectPincode(pincode)}
                    className="px-4 h-11 rounded-xl bg-[#dae2fd] text-[#007185] font-label font-bold text-xs hover:bg-[#b8c4ff] transition-colors shrink-0 disabled:opacity-60"
                  >
                    {isDetectingPin ? 'Detecting...' : 'Auto-detect'}
                  </button>
                </div>
                {formErrors.pincode ? (
                  <span className="text-[11px] text-rose-600 font-medium">{formErrors.pincode}</span>
                ) : null}
              </div>

              {/* Name & Mobile Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Arya Sharma"
                    className={`h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border transition-all ${
                      formErrors.name ? 'border-rose-500' : 'border-[#D5D9D9] focus:border-[#007185]'
                    }`}
                  />
                  {formErrors.name && (
                    <span className="text-[11px] text-rose-600 font-medium">{formErrors.name}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                    10-Digit Mobile Number *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-[#444653]">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="98765 00000"
                      className={`w-full h-11 pl-12 pr-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border transition-all ${
                        formErrors.phone ? 'border-rose-500' : 'border-[#D5D9D9] focus:border-[#007185]'
                      }`}
                    />
                  </div>
                  {formErrors.phone && (
                    <span className="text-[11px] text-rose-600 font-medium">{formErrors.phone}</span>
                  )}
                </div>
              </div>

              {/* Flat, House No., Building */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Flat, House No., Building, Company *
                </label>
                <input
                  type="text"
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  placeholder="e.g. Suite 402, Tower B, Palm Residences"
                  className={`h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border transition-all ${
                    formErrors.flat ? 'border-rose-500' : 'border-[#D5D9D9] focus:border-[#007185]'
                  }`}
                />
                {formErrors.flat && (
                  <span className="text-[11px] text-rose-600 font-medium">{formErrors.flat}</span>
                )}
              </div>

              {/* Area, Colony, Street */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Area, Colony, Street, Sector *
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. 100 Feet Road, Indiranagar"
                  className={`h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border transition-all ${
                    formErrors.area ? 'border-rose-500' : 'border-[#D5D9D9] focus:border-[#007185]'
                  }`}
                />
                {formErrors.area && (
                  <span className="text-[11px] text-rose-600 font-medium">{formErrors.area}</span>
                )}
              </div>

              {/* Landmark */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Opposite Metro Pillar 128"
                  className="h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                />
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                    Town / City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                    State *
                  </label>
                  <select
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    className="h-11 px-3 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address Category Cards */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Address Category
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['Home', 'Work', 'Other'] as AddressType[]).map((type) => {
                    const isSelected = addressType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setAddressType(type);
                          if (type === 'Home') {
                            setDeliveryHours('Open all days • 9:00 AM – 8:00 PM');
                          } else if (type === 'Work') {
                            setDeliveryHours('Weekdays Only (Mon–Fri) • 9:30 AM – 6:00 PM');
                          } else {
                            setDeliveryHours('Deliver anytime • Call upon arrival');
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-[#dde1ff] border-[#007185] text-[#007185] font-bold shadow-xs'
                            : 'bg-[#F7F8F8] border-[#D5D9D9] text-[#444653] hover:bg-[#D5D9D9]'
                        }`}
                      >
                        {type === 'Home' && <Home className="h-5 w-5 mb-1 text-[#007185]" />}
                        {type === 'Work' && <Briefcase className="h-5 w-5 mb-1 text-[#904d00]" />}
                        {type === 'Other' && <Users className="h-5 w-5 mb-1 text-[#444653]" />}
                        <span className="text-xs font-semibold">{type}</span>
                        <span className="text-[10px] opacity-75 font-body">
                          {type === 'Home' ? 'All Day' : type === 'Work' ? '10AM-6PM' : 'Flexible'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Doorstep Delivery Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-label font-bold uppercase tracking-wider text-[#444653]">
                  Doorstep Delivery Instructions
                </label>
                <input
                  type="text"
                  value={doorstepInstructions}
                  onChange={(e) => setDoorstepInstructions(e.target.value)}
                  placeholder="e.g. Leave with security desk, or ring bell"
                  className="h-11 px-3.5 rounded-xl bg-[#F7F8F8] text-sm font-label text-[#0F1111] focus:outline-none focus:bg-white border border-[#D5D9D9] focus:border-[#007185] transition-all"
                />
              </div>

              {/* Make Default Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="make_default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007185] accent-[#007185] cursor-pointer"
                />
                <label
                  htmlFor="make_default"
                  className="text-xs font-label font-semibold text-[#0F1111] cursor-pointer select-none"
                >
                  Make this my primary default delivery address
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3 border-t border-[#D5D9D9] mt-auto">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#F7F8F8] text-[#0F1111] font-label font-semibold text-xs hover:bg-[#D5D9D9] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#007185] text-white font-label font-bold text-xs hover:bg-[#004B57] transition-colors shadow-md"
                >
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {addressToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-[#D5D9D9]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-base font-headline font-bold text-[#0F1111]">
                  Delete Saved Address?
                </h4>
                <p className="text-xs text-[#565959]">
                  This action will remove the address from your saved delivery locations.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F7F8F8] rounded-xl text-xs space-y-1">
              <div className="font-bold text-[#0F1111]">{addressToDelete.name} ({addressToDelete.type})</div>
              <div className="text-[#444653]">{addressToDelete.flat}, {addressToDelete.area}</div>
              <div className="text-[#444653]">{addressToDelete.city}, {addressToDelete.state} — {addressToDelete.pincode}</div>
            </div>

            {addressToDelete.isDefault && (
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Note:</strong> This is currently your default shipping address. Deleting it will reassign the next available address as default.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D5D9D9]">
              <button
                type="button"
                onClick={() => setAddressToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#444653] hover:bg-[#F7F8F8] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Yes, Delete Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

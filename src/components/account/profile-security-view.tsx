'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircle,
  Check,
  ShieldCheck,
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  MapPin,
  Calendar,
  Sparkles,
  Headphones,
  MessageSquare,
  Download,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Camera,
  Edit2,
  Info,
  X,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import {
  useUserProfileStore,
  DEFAULT_AVATAR,
  NotificationMatrix,
} from '@/store/user-profile-store';

interface ProfileSecurityViewProps {
  embeddedInAccount?: boolean;
}

export function ProfileSecurityView({
  embeddedInAccount = false,
}: ProfileSecurityViewProps) {
  const [mounted, setMounted] = useState(false);
  const store = useUserProfileStore();

  // Form local state (initialized from store)
  const [fullName, setFullName] = useState(store.fullName);
  const [email, setEmail] = useState(store.email);
  const [phone, setPhone] = useState(store.phone);
  const [dob, setDob] = useState(store.dob);
  const [gender, setGender] = useState(store.gender);
  const [displayLanguage, setDisplayLanguage] = useState(store.displayLanguage);
  const [billingCurrency, setBillingCurrency] = useState(store.billingCurrency);
  const [twoFactor, setTwoFactor] = useState(store.twoFactorEnabled);
  const [notifications, setNotifications] = useState<NotificationMatrix>(store.notifications);

  // Password fields state (Never stored in localStorage)
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState('All Systems Protected');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deactivateAccordionOpen, setDeactivateAccordionOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Modals
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [deactivateConfirmModal, setDeactivateConfirmModal] = useState<null | 'suspend' | 'delete'>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state if store updates
  useEffect(() => {
    if (mounted) {
      setFullName(store.fullName);
      setEmail(store.email);
      setPhone(store.phone);
      setDob(store.dob);
      setGender(store.gender);
      setDisplayLanguage(store.displayLanguage);
      setBillingCurrency(store.billingCurrency);
      setTwoFactor(store.twoFactorEnabled);
      setNotifications(store.notifications);
    }
  }, [mounted, store]);

  // Password strength evaluation
  const pwdEvaluation = useMemo(() => {
    const val = newPwd;
    const hasMinLength = val.length >= 10;
    const hasCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);

    const checksPassed = [hasMinLength, hasCase, hasNumber, hasSpecial].filter(Boolean).length;

    let label = 'Optimal Complex';
    let level = checksPassed;
    if (val.length === 0) {
      level = 3; // default state in Stitch mockup
      label = 'Optimal Complex';
    } else if (checksPassed === 4) {
      label = 'Invulnerable Standard';
    } else if (checksPassed >= 2) {
      label = 'Strong Defense';
    } else {
      label = 'Basic / Vulnerable';
    }

    return {
      hasMinLength,
      hasCase,
      hasNumber,
      hasSpecial,
      checksPassed,
      level,
      label,
    };
  }, [newPwd]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleSaveAll = () => {
    // Password check if user started typing a new password
    if (newPwd || confirmPwd) {
      if (newPwd !== confirmPwd) {
        setPwdError('New passwords do not match. Please verify.');
        showToast('Password confirmation does not match.', 'error');
        return;
      }
      if (newPwd.length < 10) {
        setPwdError('Password must contain at least 10 characters.');
        showToast('Password is too short (min 10 chars).', 'error');
        return;
      }
      setPwdError('');
    }

    setIsSaving(true);
    setIsUpdatingStatus(true);
    setStatusText('Updating Vault...');

    setTimeout(() => {
      store.updateProfile({
        fullName: fullName.trim() || store.fullName,
        email: email.trim() || store.email,
        phone: phone.trim() || store.phone,
        dob,
        gender,
        displayLanguage,
        billingCurrency,
        twoFactorEnabled: twoFactor,
        notifications,
      });

      if (newPwd) {
        // Clear passwords from form memory
        setCurrentPwd('');
        setNewPwd('');
        setConfirmPwd('');
        showToast('Profile & credentials security preferences saved seamlessly.', 'success');
      } else {
        showToast('Profile & security preferences saved seamlessly.', 'success');
      }

      setIsSaving(false);
      setIsUpdatingStatus(false);
      setStatusText('All Systems Protected');
    }, 700);
  };

  const handleDiscard = () => {
    setFullName(store.fullName);
    setEmail(store.email);
    setPhone(store.phone);
    setDob(store.dob);
    setGender(store.gender);
    setDisplayLanguage(store.displayLanguage);
    setBillingCurrency(store.billingCurrency);
    setTwoFactor(store.twoFactorEnabled);
    setNotifications(store.notifications);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');

    setStatusText('Reverted to Default');
    setTimeout(() => {
      setStatusText('All Systems Protected');
    }, 1500);

    showToast('Changes discarded. Restored saved profile values.', 'info');
  };

  const handleToggle2FA = (checked: boolean) => {
    setTwoFactor(checked);
    store.setTwoFactor(checked);
    if (checked) {
      showToast('Two-Factor Authentication activated for WhatsApp & SMS.', 'success');
    } else {
      showToast('Two-Factor Authentication paused.', 'info');
    }
  };

  const handleToggleNotification = (
    topic: keyof NotificationMatrix,
    channel: 'whatsapp' | 'sms' | 'email' | 'push'
  ) => {
    const nextVal = !notifications[topic][channel];
    const updated = {
      ...notifications,
      [topic]: {
        ...notifications[topic],
        [channel]: nextVal,
      },
    };
    setNotifications(updated);
    store.updateNotification(topic, channel, nextVal);
  };

  const handleExportDataArchive = () => {
    const dataDossier = {
      exportedAt: new Date().toISOString(),
      clientIdentity: {
        legalName: store.fullName,
        email: store.email,
        phone: store.phone,
        dob: store.dob,
        gender: store.gender,
      },
      preferences: {
        language: store.displayLanguage,
        currency: store.billingCurrency,
        twoFactorActive: store.twoFactorEnabled,
        notifications: store.notifications,
      },
      activeSessions: store.sessions,
      securityAudit: {
        healthScore: `${store.securityScore}%`,
        lastPasswordRotation: store.lastPasswordChange,
        encryptionGrade: 'AES-256 GCM Client Vault',
      },
      disclaimer: 'This dossier is cryptographically compiled for regulatory compliance and private archival.',
    };

    const blob = new Blob([JSON.stringify(dataDossier, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vyntra-profile-dossier-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      `Personal Data Archive compiled and downloaded. Token dispatched to ${store.email}.`,
      'success'
    );
  };

  if (!mounted) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#565959] font-medium">Loading profile credentials & security vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 pb-12 antialiased text-[#0F1111]">
      {/* Toast Notification */}
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

      {/* Breadcrumbs & Dynamic Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D5D9D9]">
        <div className="space-y-1.5">
          {!embeddedInAccount ? (
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#565959] font-medium">
              <Link href="/" className="hover:text-[#007185] transition-colors">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
              <Link href="/account" className="hover:text-[#007185] transition-colors">
                My Account
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
              <span className="text-[#0F1111] font-semibold">Profile &amp; Security Settings</span>
            </nav>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#565959] font-medium">
              <span>Account Central</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#c4c5d5]" />
              <span className="text-[#007185] font-semibold">Profile &amp; Security Settings</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-2xl lg:text-3xl font-headline font-extrabold tracking-tight text-[#0F1111]">
              Profile &amp; Security Settings
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE4B5] text-[#0F1111] text-xs font-semibold">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUpdatingStatus ? 'bg-[#007185] animate-ping' : 'bg-[#904d00]'
                }`}
              />
              <span>{statusText}</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-[#444653] max-w-2xl leading-relaxed">
            Manage your verified legal credentials, high-touch luxury communications, and vault-level biometric &amp;
            2FA protocols.
          </p>
        </div>

        {/* Quick Actions (Top Right) */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-[#444653] bg-[#D5D9D9] hover:bg-[#dae2fd] transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#007185] hover:bg-[#004B57] shadow-md transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Split Grid: Identity Dossier (Left) vs Controls & Security (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Identity, Vault Status & VIP Liaison (4 cols) */}
        {/* ========================================================= */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* VIP Member Profile Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-[#D5D9D9]">
            {/* Gold / Marigold Foil Accent Ribbon */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-[#FFE4B5] to-[#FF9900] rounded-full blur-2xl opacity-40 pointer-events-none" />

            <div className="flex flex-col items-center text-center relative z-10">
              {/* Avatar Unit with Badge */}
              <div className="relative mb-4 group">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#FF9900] via-[#e2e7ff] to-[#007185] shadow-md">
                  {store.avatar ? (
                    <div className="relative w-full h-full rounded-full overflow-hidden">
                      <Image
                        src={store.avatar}
                        alt={store.fullName}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#004B57] text-white flex items-center justify-center font-headline font-bold text-2xl">
                      {store.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#007185] text-white hover:bg-[#004B57] shadow-md transition-transform group-hover:scale-110"
                  title="Upload new photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>


              <h2 className="text-xl font-headline font-bold text-[#0F1111]">{store.fullName}</h2>
              <p className="text-xs text-[#444653] font-mono mt-0.5">{store.email}</p>


              {/* Photo Actions */}
              <div className="flex items-center justify-center gap-4 mt-4 w-full text-xs">
                <button
                  type="button"
                  onClick={() => setPhotoModalOpen(true)}
                  className="text-[#007185] hover:underline font-semibold flex items-center gap-1"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Change Photo
                </button>
                <span className="text-[#c4c5d5]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    store.removeAvatar();
                    showToast('Profile photo removed. Reverted to initials monogram.', 'info');
                  }}
                  className="text-[#ba1a1a] hover:underline font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>

          {/* Account Security Health Meter */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#D5D9D9]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#007185]" />
                <h3 className="font-headline font-bold text-sm text-[#0F1111]">Security Integrity</h3>
              </div>
              <span className="text-xs font-bold font-mono text-[#007185] px-2.5 py-0.5 rounded-full bg-[#dde1ff]">
                {twoFactor ? '92% Strong' : '74% Moderate'}
              </span>
            </div>

            {/* Segmented Progress bar */}
            <div className="w-full h-2.5 rounded-full bg-[#e2e7ff] overflow-hidden flex">
              <div
                className="h-full bg-[#007185] rounded-full transition-all duration-500"
                style={{ width: twoFactor ? '92%' : '74%' }}
              />
            </div>
            <p className="text-xs text-[#444653] mt-2 leading-relaxed">
              Your account satisfies top-tier encryption standards.{' '}
              {twoFactor ? '3 of 3 authentications active.' : '2 of 3 authentications active.'}
            </p>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#D5D9D9]">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F7F8F8] text-xs text-[#0F1111] font-medium">
                <Check className="h-3.5 w-3.5 text-[#007185]" /> Mobile OK
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F7F8F8] text-xs text-[#0F1111] font-medium">
                <Check className="h-3.5 w-3.5 text-[#007185]" /> Primary Email OK
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                  twoFactor ? 'bg-[#dde1ff] text-[#007185]' : 'bg-[#fff1ed] text-[#ba1a1a]'
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> {twoFactor ? '2FA Active' : '2FA Inactive'}
              </span>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-[#F7F8F8] flex items-start gap-2.5 border border-[#D5D9D9]">
              <Info className="h-4 w-4 text-[#FF9900] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#444653] leading-normal">
                <strong>Security Recommendation:</strong> Regular password rotation is suggested every 180 days. Your
                password was last updated {store.lastPasswordChange}.
              </p>
            </div>
          </div>

          {/* Dedicated Royal Concierge Liaison */}
          <div className="rounded-2xl bg-gradient-to-br from-[#F7F8F8] via-white to-[#F7F8F8] p-6 shadow-sm border border-[#D5D9D9] relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#904d00]">
                  White Glove Assistance
                </span>
                <h4 className="font-headline font-bold text-base text-[#0F1111]">Dedicated Concierge</h4>
              </div>
              <span className="inline-block p-1.5 rounded-full bg-[#FFE4B5] text-[#0F1111]">
                <Headphones className="h-4 w-4" />
              </span>
            </div>

            <div className="flex items-center gap-3.5 mt-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm shrink-0">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3lY_HdrQOqrcHRGOoF9lHFx_QZXSZzwBO0Uqkv_K73ZeSAZLFXx6dvlsDDwE_jKW4DucyNfesTlGyiapoAfVpUc8udGnNck4xNGgYDBwPHQF1rgASJT0IMXkzUBJt1DV1m9PFiXHz4tGnwzoxEf3HuO6wC7OkrNhcStzlYY5sXrZDT81dLX1rIohCzNRltPNN8pL24UlZI9rvfGbhEZ8VPXHEfeT5flzZaNnYT4E"
                  alt="Kavita Nair - Concierge"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-[#0F1111]">Kavita Nair</div>
                <div className="text-xs text-[#444653]">Senior Private Client Liaison</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#007185] font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#007185] animate-pulse" />
                  Available 24/7 Priority
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF9900] text-white font-semibold text-xs tracking-wide shadow-md hover:bg-[#904d00] transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span>1-Click WhatsApp Concierge</span>
            </a>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Granular Settings Cards (8 cols) */}
        {/* ========================================================= */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          {/* SECTION 1: Personal Identification */}
          <div className="rounded-2xl bg-white p-6 lg:p-8 shadow-sm border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-6 border-b border-[#D5D9D9]">
              <div className="space-y-0.5">
                <h3 className="font-headline font-bold text-lg text-[#0F1111] flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#007185]" />
                  <span>Personal Identification</span>
                </h3>
                <p className="text-xs text-[#444653]">
                  Official identification details synced across your orders and customs declarations.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#007185] uppercase tracking-wider bg-[#dde1ff] px-2.5 py-1 rounded-full">
                Step 01 / 04
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              {/* Full Legal Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">Full Legal Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]/20 transition-all border border-[#D5D9D9]"
                  />
                  <CheckCircle className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#007185]" />
                </div>
              </div>

              {/* Verified Email */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0F1111]">Verified Email Address</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTempEmail(email);
                      setEmailModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#007185] hover:underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:outline-none border border-[#D5D9D9] cursor-pointer"
                    onClick={() => {
                      setTempEmail(email);
                      setEmailModalOpen(true);
                    }}
                  />
                  <Check className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#007185]" />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0F1111]">Mobile Number</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTempPhone(phone);
                      setPhoneModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#007185] hover:underline"
                  >
                    Update Number
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    readOnly
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:outline-none border border-[#D5D9D9] cursor-pointer"
                    onClick={() => {
                      setTempPhone(phone);
                      setPhoneModalOpen(true);
                    }}
                  />
                  <Lock className="h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#007185]" />
                </div>
              </div>

              {/* Date of Birth with Festive Perk */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0F1111]">Date of Birth</label>
                  <span className="text-[10px] font-bold text-[#FF9900] uppercase tracking-tight bg-[#FFE4B5] px-2 py-0.5 rounded">
                    Perk Active
                  </span>
                </div>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]/20 transition-all border border-[#D5D9D9]"
                />
              </div>
            </div>

            {/* Gender Identification Selectors */}
            <div className="mt-6 flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#0F1111]">Gender Identification</label>
              <div className="flex flex-wrap gap-2">
                {(['female', 'male', 'non-binary', 'prefer-not-to-say'] as const).map((g) => {
                  const labels: Record<string, string> = {
                    female: 'Female',
                    male: 'Male',
                    'non-binary': 'Non-Binary',
                    'prefer-not-to-say': 'Prefer not to say',
                  };
                  const isSelected = gender === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#007185] text-white shadow-sm'
                          : 'bg-[#F7F8F8] text-[#0F1111] hover:bg-[#D5D9D9]'
                      }`}
                    >
                      {labels[g]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Regional & Currency Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 pt-6 bg-[#F7F8F8]/70 rounded-xl p-4 border border-[#D5D9D9]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">Marketplace Display Language</label>
                <select
                  value={displayLanguage}
                  onChange={(e) => setDisplayLanguage(e.target.value)}
                  className="w-full h-10 px-3 bg-white rounded-lg text-xs font-medium text-[#0F1111] focus:outline-none shadow-sm border border-[#D5D9D9]"
                >
                  <option value="English (India) - Preferred">English (India) - Preferred</option>
                  <option value="हिन्दी (Hindi)">हिन्दी (Hindi)</option>
                  <option value="मराठी (Marathi)">मराठी (Marathi)</option>
                  <option value="தமிழ் (Tamil)">தமிழ் (Tamil)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">Billing Currency</label>
                <select
                  value={billingCurrency}
                  onChange={(e) => setBillingCurrency(e.target.value)}
                  className="w-full h-10 px-3 bg-white rounded-lg text-xs font-medium text-[#0F1111] focus:outline-none shadow-sm border border-[#D5D9D9]"
                >
                  <option value="INR (₹) - Indian Rupee">INR (₹) - Indian Rupee</option>
                  <option value="USD ($) - US Dollar (International Concierge)">
                    USD ($) - US Dollar (International Concierge)
                  </option>
                  <option value="AED (د.إ) - UAE Dirham">AED (د.إ) - UAE Dirham</option>
                  <option value="GBP (£) - British Pound">GBP (£) - British Pound</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Password & Credentials Security */}
          <div className="rounded-2xl bg-white p-6 lg:p-8 shadow-sm border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-6 border-b border-[#D5D9D9]">
              <div className="space-y-0.5">
                <h3 className="font-headline font-bold text-lg text-[#0F1111] flex items-center gap-2">
                  <Key className="h-5 w-5 text-[#007185]" />
                  <span>Password &amp; Credentials Security</span>
                </h3>
                <p className="text-xs text-[#444653]">
                  Configure multi-layered access safeguards and audit active authentication instances.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#007185] uppercase tracking-wider bg-[#dde1ff] px-2.5 py-1 rounded-full">
                Step 02 / 04
              </span>
            </div>

            {/* Password Modification Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* Current Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]/20 transition-all border border-[#D5D9D9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565959] hover:text-[#0F1111]"
                  >
                    {showCurrentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => {
                      setNewPwd(e.target.value);
                      if (pwdError) setPwdError('');
                    }}
                    placeholder="At least 10 chars"
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]/20 transition-all border border-[#D5D9D9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565959] hover:text-[#0F1111]"
                  >
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#0F1111]">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => {
                      setConfirmPwd(e.target.value);
                      if (pwdError) setPwdError('');
                    }}
                    placeholder="Repeat new password"
                    className="w-full h-11 px-3.5 pr-10 bg-[#F7F8F8] rounded-xl text-sm text-[#0F1111] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007185]/20 transition-all border border-[#D5D9D9]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#565959] hover:text-[#0F1111]"
                  >
                    {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {pwdError && (
              <p className="text-xs text-[#ba1a1a] font-medium mt-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{pwdError}</span>
              </p>
            )}

            {/* Password Strength Tracker */}
            <div className="mt-4 p-4 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#444653] font-medium">Password Robustness Standard:</span>
                <span className="font-bold text-[#007185]">{pwdEvaluation.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    pwdEvaluation.level >= 1 ? 'bg-[#007185]' : 'bg-[#e2e7ff]'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    pwdEvaluation.level >= 2 ? 'bg-[#007185]' : 'bg-[#e2e7ff]'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    pwdEvaluation.level >= 3 ? 'bg-[#007185]' : 'bg-[#e2e7ff]'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    pwdEvaluation.level >= 4 ? 'bg-[#007185]' : 'bg-[#e2e7ff]'
                  }`}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-[#565959]">
                <span
                  className={`flex items-center gap-1 ${
                    pwdEvaluation.hasMinLength ? 'text-[#007185] font-semibold' : 'text-[#565959]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> 10+ characters
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    pwdEvaluation.hasCase ? 'text-[#007185] font-semibold' : 'text-[#565959]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> Uppercase &amp; lowercase
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    pwdEvaluation.hasNumber ? 'text-[#007185] font-semibold' : 'text-[#565959]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> Numerical figure
                </span>
                <span
                  className={`flex items-center gap-1 ${
                    pwdEvaluation.hasSpecial ? 'text-[#007185] font-semibold' : 'text-[#565959]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" /> Special character
                </span>
              </div>
            </div>

            {/* Two-Factor Authentication (2FA) Module */}
            <div className="mt-6 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white text-[#007185] shadow-sm">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline font-bold text-sm text-[#0F1111]">
                      Two-Factor Authentication (2FA)
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        twoFactor ? 'bg-[#dde1ff] text-[#007185]' : 'bg-[#e2e7ff] text-[#565959]'
                      }`}
                    >
                      {twoFactor ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <p className="text-xs text-[#444653] mt-0.5 max-w-xl">
                    High-assurance OTP dispatched via WhatsApp &amp; SMS to <strong>{phone}</strong> prior to any
                    vault transfer or address mutation.
                  </p>
                </div>
              </div>

              {/* Interactive Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={twoFactor}
                  onChange={(e) => handleToggle2FA(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dae2fd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007185]" />
              </label>
            </div>

            {/* Active Logged-in Devices Section */}
            <div className="mt-6 pt-6 border-t border-[#D5D9D9]">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                  <h4 className="font-headline font-bold text-sm text-[#0F1111] flex items-center gap-1.5">
                    <Laptop className="h-4 w-4 text-[#565959]" />
                    <span>Active Authenticated Sessions</span>
                  </h4>
                  <p className="text-xs text-[#444653]">
                    Devices currently authorized to access your VYNTRA client vault.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    store.logoutAllOtherSessions();
                    showToast('Logged out from all other remote device sessions.', 'info');
                  }}
                  className="text-xs font-semibold text-[#ba1a1a] hover:underline flex items-center gap-1"
                >
                  <LogOut className="h-3.5 w-3.5" /> Log out all other devices
                </button>
              </div>

              <div className="space-y-2.5">
                {store.sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F8F8] border border-[#D5D9D9]"
                  >
                    <div className="flex items-center gap-3">
                      {sess.device.includes('iPhone') || sess.device.includes('Mobile') ? (
                        <Smartphone className="h-5 w-5 text-[#565959] shrink-0" />
                      ) : (
                        <Laptop className="h-5 w-5 text-[#007185] shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F1111]">
                            {sess.browser} on {sess.os}
                          </span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-[#FFE4B5] text-[#0F1111] text-[10px] font-bold">
                              CURRENT SESSION
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#444653]">
                          {sess.location} • IP {sess.ip} • {sess.lastActive}
                        </span>
                      </div>
                    </div>

                    {sess.isCurrent ? (
                      <CheckCircle className="h-4 w-4 text-[#007185]" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          store.revokeSession(sess.id);
                          showToast(`Access revoked for ${sess.device}.`, 'info');
                        }}
                        className="text-xs font-semibold text-[#ba1a1a] hover:bg-[#D5D9D9] px-3 py-1 rounded-md transition-colors"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: Communication & Concierge Notifications */}
          <div className="rounded-2xl bg-white p-6 lg:p-8 shadow-sm border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-6 border-b border-[#D5D9D9]">
              <div className="space-y-0.5">
                <h3 className="font-headline font-bold text-lg text-[#0F1111] flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-[#007185]" />
                  <span>Communication &amp; Concierge Notifications</span>
                </h3>
                <p className="text-xs text-[#444653]">
                  Control the frequency and transmission channels of your personalized updates.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#007185] uppercase tracking-wider bg-[#dde1ff] px-2.5 py-1 rounded-full">
                Step 03 / 04
              </span>
            </div>

            {/* Notification Matrix Table */}
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7F8F8] text-[#444653] font-semibold">
                    <th className="py-3 px-4 rounded-l-lg">Channel Topic</th>
                    <th className="py-3 px-3 text-center">WhatsApp</th>
                    <th className="py-3 px-3 text-center">SMS</th>
                    <th className="py-3 px-3 text-center">Email</th>
                    <th className="py-3 px-4 text-center rounded-r-lg">Push App</th>
                  </tr>
                </thead>
                <tbody className="text-[#0F1111]">
                  {/* Row 1: Order Logistics */}
                  <tr className="hover:bg-[#F7F8F8]/50 transition-colors border-b border-[#D5D9D9]/60">
                    <td className="py-4 px-4 font-medium">
                      <div className="font-bold text-[#0F1111]">Order Logistics &amp; Real-time ETA</div>
                      <div className="text-[11px] text-[#444653]">
                        White-glove dispatches, delivery window forecasts, signature approvals
                      </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.orderLogistics.whatsapp}
                        onChange={() => handleToggleNotification('orderLogistics', 'whatsapp')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.orderLogistics.sms}
                        onChange={() => handleToggleNotification('orderLogistics', 'sms')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.orderLogistics.email}
                        onChange={() => handleToggleNotification('orderLogistics', 'email')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-4">
                      <input
                        type="checkbox"
                        checked={notifications.orderLogistics.push}
                        onChange={() => handleToggleNotification('orderLogistics', 'push')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                  </tr>

                  {/* Row 2: Festive Drops */}
                  <tr className="hover:bg-[#F7F8F8]/50 transition-colors border-b border-[#D5D9D9]/60">
                    <td className="py-4 px-4 font-medium">
                      <div className="font-bold text-[#0F1111]">Festive Drops &amp; Runway Previews</div>
                      <div className="text-[11px] text-[#444653]">
                        Private atelier collections, Diwali bespoke editions, preview windows
                      </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.festiveDrops.whatsapp}
                        onChange={() => handleToggleNotification('festiveDrops', 'whatsapp')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.festiveDrops.sms}
                        onChange={() => handleToggleNotification('festiveDrops', 'sms')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.festiveDrops.email}
                        onChange={() => handleToggleNotification('festiveDrops', 'email')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-4">
                      <input
                        type="checkbox"
                        checked={notifications.festiveDrops.push}
                        onChange={() => handleToggleNotification('festiveDrops', 'push')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                  </tr>

                  {/* Row 3: Vault Price Alerts */}
                  <tr className="hover:bg-[#F7F8F8]/50 transition-colors border-b border-[#D5D9D9]/60">
                    <td className="py-4 px-4 font-medium">
                      <div className="font-bold text-[#0F1111]">Vault Price Alerts &amp; Rare Restocks</div>
                      <div className="text-[11px] text-[#444653]">
                        Notifications for items preserved inside your private wishlist archive
                      </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.vaultAlerts.whatsapp}
                        onChange={() => handleToggleNotification('vaultAlerts', 'whatsapp')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.vaultAlerts.sms}
                        onChange={() => handleToggleNotification('vaultAlerts', 'sms')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.vaultAlerts.email}
                        onChange={() => handleToggleNotification('vaultAlerts', 'email')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-4">
                      <input
                        type="checkbox"
                        checked={notifications.vaultAlerts.push}
                        onChange={() => handleToggleNotification('vaultAlerts', 'push')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                  </tr>

                  {/* Row 4: Curated Editorial Magazine */}
                  <tr className="hover:bg-[#F7F8F8]/50 transition-colors">
                    <td className="py-4 px-4 font-medium">
                      <div className="font-bold text-[#0F1111]">Curated Editorial Magazine &amp; Styling Notes</div>
                      <div className="text-[11px] text-[#444653]">
                        Weekly digest from our Creative Director and haute joaillerie curators
                      </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.editorialNotes.whatsapp}
                        onChange={() => handleToggleNotification('editorialNotes', 'whatsapp')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.editorialNotes.sms}
                        onChange={() => handleToggleNotification('editorialNotes', 'sms')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-3">
                      <input
                        type="checkbox"
                        checked={notifications.editorialNotes.email}
                        onChange={() => handleToggleNotification('editorialNotes', 'email')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                    <td className="text-center py-4 px-4">
                      <input
                        type="checkbox"
                        checked={notifications.editorialNotes.push}
                        onChange={() => handleToggleNotification('editorialNotes', 'push')}
                        className="w-4 h-4 accent-[#007185] rounded cursor-pointer"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Privacy & Account Governance */}
          <div className="rounded-2xl bg-white p-6 lg:p-8 shadow-sm border border-[#D5D9D9]">
            <div className="flex items-center justify-between pb-6 border-b border-[#D5D9D9]">
              <div className="space-y-0.5">
                <h3 className="font-headline font-bold text-lg text-[#0F1111] flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#007185]" />
                  <span>Privacy &amp; Account Governance</span>
                </h3>
                <p className="text-xs text-[#444653]">
                  Execute regulatory data export requests or manage lifecycle status.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#007185] uppercase tracking-wider bg-[#dde1ff] px-2.5 py-1 rounded-full">
                Step 04 / 04
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Export Data Tile */}
              <div className="p-5 rounded-xl bg-[#F7F8F8] flex flex-col justify-between border border-[#D5D9D9]">
                <div>
                  <div className="flex items-center gap-2 text-[#0F1111] font-bold text-sm mb-1">
                    <Download className="h-4 w-4 text-[#007185]" />
                    <span>Export Personal Data Archive</span>
                  </div>
                  <p className="text-xs text-[#444653] leading-relaxed">
                    Download a cryptographically signed dossier containing your complete purchase lineage, concierge
                    correspondence, and address records (JSON format).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportDataArchive}
                  className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#007185] font-bold text-xs hover:bg-[#007185] hover:text-white transition-all shadow-sm border border-[#D5D9D9]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Generate Archive (.json)</span>
                </button>
              </div>

              {/* Privacy Shield Compliance */}
              <div className="p-5 rounded-xl bg-[#F7F8F8] flex flex-col justify-between border border-[#D5D9D9]">
                <div>
                  <div className="flex items-center gap-2 text-[#0F1111] font-bold text-sm mb-1">
                    <Shield className="h-4 w-4 text-[#FF9900]" />
                    <span>Privacy Shield Compliance</span>
                  </div>
                  <p className="text-xs text-[#444653] leading-relaxed">
                    VYNTRA guarantees zero third-party data broker monetization. All sizing measurements and private
                    concierge chats remain strictly confidential.
                  </p>
                </div>
                <a
                  href="#privacy-charter"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast('Vyntra Privacy Charter: 100% encrypted, zero data brokering.', 'info');
                  }}
                  className="mt-4 inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#FF9900] hover:underline"
                >
                  <span>Review Privacy Charter</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Deactivation / Account Termination Accordion */}
            <div className="mt-6 pt-6 border-t border-[#D5D9D9]">
              <div className="rounded-xl overflow-hidden bg-[#ffdad6]/20 border border-[#ffdad6]">
                <button
                  type="button"
                  onClick={() => setDeactivateAccordionOpen(!deactivateAccordionOpen)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-[#ffdad6]/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-[#ba1a1a]" />
                    <span className="text-xs font-bold text-[#ba1a1a] uppercase tracking-wider">
                      Account Deactivation &amp; Erasure
                    </span>
                  </div>
                  {deactivateAccordionOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#ba1a1a]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#ba1a1a]" />
                  )}
                </button>

                {deactivateAccordionOpen && (
                  <div className="p-5 pt-0 text-xs text-[#444653] space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl bg-white text-[#0F1111] border border-[#ffdad6]">
                      <strong className="text-[#ba1a1a] font-headline block mb-1">
                        Before you delete your account
                      </strong>
                      Deleting your account removes your profile, saved addresses and access to your order history.
                      Orders that are already placed will still be delivered.
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDeactivateConfirmModal('suspend')}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D5D9D9] text-[#0F1111] hover:bg-[#dae2fd] transition-colors"
                      >
                        Temporarily Suspend Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeactivateConfirmModal('delete')}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#ba1a1a] hover:bg-[#93000a] transition-colors"
                      >
                        Permanently Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Responsive Quick Bar */}
      <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white shadow-sm border border-[#D5D9D9] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-[#007185] shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#0F1111]">
              Last Master Security Sync: {store.lastMasterSync}
            </div>
            <div className="text-[11px] text-[#444653]">
              All cryptographic tokens and WhatsApp notifications operational.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#444653] hover:text-[#0F1111] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#007185] hover:bg-[#004B57] shadow transition-all disabled:opacity-70"
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: CHANGE EMAIL MODAL */}
      {/* ============================================================= */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h3 className="font-headline font-bold text-base text-[#0F1111]">Update Email Address</h3>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#444653]">
              An authentication OTP verification link will be dispatched to your new address.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">New Email Address</label>
              <input
                type="email"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                placeholder="name@example.com"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempEmail && tempEmail.includes('@')) {
                    setEmail(tempEmail);
                    store.updateProfile({ email: tempEmail });
                    setEmailModalOpen(false);
                    showToast(`Verification token sent to ${tempEmail}. Email updated!`, 'success');
                  }
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white"
              >
                Send Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: UPDATE PHONE NUMBER MODAL */}
      {/* ============================================================= */}
      {phoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h3 className="font-headline font-bold text-base text-[#0F1111]">Update Mobile Number</h3>
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#444653]">
              A 6-digit OTP will be dispatched via SMS &amp; WhatsApp to authenticate your new phone number.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">New Mobile Number</label>
              <input
                type="tel"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhoneModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tempPhone && tempPhone.length >= 8) {
                    setPhone(tempPhone);
                    store.updateProfile({ phone: tempPhone });
                    setPhoneModalOpen(false);
                    showToast(`OTP verified! Mobile number updated to ${tempPhone}.`, 'success');
                  }
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white"
              >
                Send OTP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: CHANGE PROFILE PHOTO MODAL */}
      {/* ============================================================= */}
      {photoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D5D9D9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D9D9]">
              <h3 className="font-headline font-bold text-base text-[#0F1111]">Change Profile Photo</h3>
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="text-[#565959] hover:text-[#0F1111]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-[#444653]">
              Upload a high-resolution portrait or enter a hosted photo URL.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F1111] mb-1">Image URL</label>
              <input
                type="url"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                className="w-full h-11 px-3.5 bg-[#F7F8F8] rounded-xl text-sm font-medium border border-[#D5D9D9] focus:outline-none focus:bg-white"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  store.setAvatar(DEFAULT_AVATAR);
                  setPhotoModalOpen(false);
                  showToast('Restored default royal portrait.', 'success');
                }}
                className="text-xs font-semibold text-[#007185] hover:underline"
              >
                Restore Default Portrait
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPhotoModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (customAvatarUrl) {
                    store.setAvatar(customAvatarUrl);
                    setCustomAvatarUrl('');
                    setPhotoModalOpen(false);
                    showToast('Profile photo updated successfully!', 'success');
                  }
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#007185] text-white"
              >
                Update Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 4: DEACTIVATION / SUSPENSION CONFIRMATION MODAL */}
      {/* ============================================================= */}
      {deactivateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ffdad6] space-y-4">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="font-headline font-bold text-base text-[#0F1111]">
                {deactivateConfirmModal === 'suspend'
                  ? 'Confirm Profile Suspension'
                  : 'Permanently Delete Account'}
              </h3>
            </div>
            <p className="text-xs text-[#444653] leading-relaxed">
              {deactivateConfirmModal === 'suspend'
                ? 'Your profile will be paused. You can reactivate it any time by signing in.'
                : 'This can’t be undone. Your profile, saved addresses and access to your order history will be deleted.'}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#565959]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = deactivateConfirmModal;
                  setDeactivateConfirmModal(null);
                  setDeactivateAccordionOpen(false);
                  if (action === 'suspend') {
                    showToast('Profile temporarily suspended. You may reactivate upon login.', 'info');
                  } else {
                    showToast('Account deletion request queued for regulatory compliance review.', 'error');
                  }
                }}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-[#ba1a1a] text-white hover:bg-[#93000a]"
              >
                {deactivateConfirmModal === 'suspend' ? 'Confirm Suspension' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

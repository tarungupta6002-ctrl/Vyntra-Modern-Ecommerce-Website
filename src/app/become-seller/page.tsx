'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Building2,
  FileText,
  CreditCard,
  MapPin,
  Lock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  PackageCheck,
  Truck,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function BecomeSellerPage() {
  const router = useRouter();

  // Authentication & existing status state
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);

  // Form Fields
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  // Tax Compliance
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  // Bank Details
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Pickup Address
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [pincodeSuccess, setPincodeSuccess] = useState(false);

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState<any>(null);

  // Indian Pincode Prefix State Mapping (Offline fallback)
  const PIN_STATE_MAP: Record<string, string> = {
    '11': 'Delhi',
    '12': 'Haryana', '13': 'Haryana',
    '14': 'Punjab', '15': 'Punjab', '16': 'Punjab',
    '17': 'Himachal Pradesh',
    '18': 'Jammu and Kashmir', '19': 'Jammu and Kashmir',
    '20': 'Uttar Pradesh', '21': 'Uttar Pradesh', '22': 'Uttar Pradesh', '23': 'Uttar Pradesh',
    '24': 'Uttar Pradesh', '25': 'Uttar Pradesh', '26': 'Uttar Pradesh', '27': 'Uttar Pradesh', '28': 'Uttar Pradesh',
    '30': 'Rajasthan', '31': 'Rajasthan', '32': 'Rajasthan', '33': 'Rajasthan', '34': 'Rajasthan',
    '36': 'Gujarat', '37': 'Gujarat', '38': 'Gujarat', '39': 'Gujarat',
    '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra', '43': 'Maharashtra', '44': 'Maharashtra',
    '45': 'Madhya Pradesh', '46': 'Madhya Pradesh', '47': 'Madhya Pradesh', '48': 'Madhya Pradesh', '49': 'Chhattisgarh',
    '50': 'Telangana', '51': 'Andhra Pradesh', '52': 'Andhra Pradesh', '53': 'Andhra Pradesh',
    '56': 'Karnataka', '57': 'Karnataka', '58': 'Karnataka', '59': 'Karnataka',
    '60': 'Tamil Nadu', '61': 'Tamil Nadu', '62': 'Tamil Nadu', '63': 'Tamil Nadu', '64': 'Tamil Nadu',
    '67': 'Kerala', '68': 'Kerala', '69': 'Kerala',
    '70': 'West Bengal', '71': 'West Bengal', '72': 'West Bengal', '73': 'West Bengal', '74': 'West Bengal',
    '75': 'Odisha', '76': 'Odisha', '77': 'Odisha',
    '78': 'Assam', '79': 'North Eastern States',
    '80': 'Bihar', '81': 'Bihar', '82': 'Bihar', '83': 'Jharkhand', '84': 'Bihar', '85': 'Bihar',
  };

  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    setPincodeSuccess(false);

    if (cleaned.length === 6) {
      setIsFetchingPincode(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          if (po.District) setCity(po.District);
          if (po.State) setState(po.State);
          setPincodeSuccess(true);
        } else {
          const prefix = cleaned.slice(0, 2);
          if (PIN_STATE_MAP[prefix]) {
            setState(PIN_STATE_MAP[prefix]);
            setPincodeSuccess(true);
          }
        }
      } catch (err) {
        const prefix = cleaned.slice(0, 2);
        if (PIN_STATE_MAP[prefix]) {
          setState(PIN_STATE_MAP[prefix]);
          setPincodeSuccess(true);
        }
      } finally {
        setIsFetchingPincode(false);
      }
    }
  };

  // Load user session and check if already applied or approved
  useEffect(() => {
    async function checkSellerStatus() {
      try {
        const res = await fetch('/api/vendor/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setCurrentUser(json.data);
            if (json.data.name) setOwnerName(json.data.name);
            if (json.data.email) setBusinessEmail(json.data.email);

            if (json.data.isVendor && json.data.vendorProfile?.status === 'APPROVED') {
              setExistingVendor(json.data.vendorProfile);
            } else if (json.data.vendorApplication) {
              setExistingApplication(json.data.vendorApplication);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to verify vendor status:', err);
      } finally {
        setAuthLoading(false);
      }
    }
    checkSellerStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!storeName.trim()) {
      setErrorMessage('Please enter your storefront / brand name.');
      return;
    }
    if (!businessPhone.trim() || businessPhone.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile number for dispatch updates.');
      return;
    }
    if (!panNumber.trim() || panNumber.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit PAN card number for tax compliance.');
      return;
    }
    if (!bankAccountNumber.trim() || bankAccountNumber !== confirmAccountNumber) {
      setErrorMessage('Bank account numbers do not match. Please verify your account number.');
      return;
    }
    if (!ifscCode.trim() || ifscCode.trim().length < 11) {
      setErrorMessage('Please provide a valid 11-digit IFSC code.');
      return;
    }
    if (!pincode.trim() || pincode.trim().length < 6) {
      setErrorMessage('Please enter a valid 6-digit postal pincode for courier pickups.');
      return;
    }
    if (!agreedTerms) {
      setErrorMessage('Please agree to the Vyntra Marketplace Merchant Agreement.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        ownerName: ownerName.trim(),
        businessEmail: businessEmail.trim(),
        businessPhone: businessPhone.trim(),
        gstNumber: gstNumber.trim().toUpperCase() || undefined,
        panNumber: panNumber.trim().toUpperCase(),
        accountHolderName: accountHolderName.trim() || ownerName.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        streetAddress: streetAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      };

      const res = await fetch('/api/vendor/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Failed to submit application.');
      }

      setSubmissionSuccess(json.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#007185] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#565959]">Checking seller status...</span>
        </div>
      </div>
    );
  }

  // Suspended / Revoked Vendor State
  if (currentUser?.vendorProfile?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-[#F7F8F8] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-rose-300 p-8 shadow-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
              License Revoked &bull; Ineligible to Sell
            </span>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111] pt-2">
              Merchant Account Suspended
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#565959] leading-relaxed">
            Your vendor license for <strong className="text-[#0F1111]">{currentUser.vendorProfile.storeName}</strong> was permanently revoked by Vyntra Marketplace Governance. All storefront product listings have been delisted and new seller onboarding submissions are restricted.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#0F1111] text-white font-bold text-xs hover:bg-[#232F3E] transition-all"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already Approved Vendor Banner
  if (existingVendor) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#D5D9D9] p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Official Vyntra Merchant
            </span>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111]">
              You are an Approved Seller!
            </h1>
            <p className="text-sm text-[#565959] leading-relaxed">
              Your store <strong className="text-[#0F1111]">{existingVendor.storeName}</strong> is verified and authorized to list products on Vyntra Marketplace.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/vendor/products/new"
              className="px-6 py-3 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-sm shadow-sm transition-all text-center"
            >
              + List a New Product
            </Link>
            <Link
              href="/vendor/products"
              className="px-6 py-3 rounded-xl bg-[#F7F8F8] hover:bg-[#EAEDED] text-[#0F1111] font-bold text-sm border border-[#D5D9D9] transition-all text-center"
            >
              Open Seller Central Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Application Pending State
  if (existingApplication && existingApplication.status === 'SUBMITTED' && !submissionSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#D5D9D9] p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Application Under Review
            </span>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111]">
              Your Seller Application is Being Verified
            </h1>
            <p className="text-sm text-[#565959] leading-relaxed">
              Your application for <strong className="text-[#0F1111]">{existingApplication.storeName}</strong> has been submitted. Vyntra Marketplace Compliance is reviewing your tax and bank details.
            </p>
          </div>

          <div className="bg-[#F7F8F8] border border-[#D5D9D9] rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#E7E7E7]">
              <span className="text-[#565959]">Application Ref ID:</span>
              <span className="font-mono font-bold text-[#0F1111]">{existingApplication.documents?.applicationRef || existingApplication.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E7E7E7]">
              <span className="text-[#565959]">Store Name:</span>
              <span className="font-bold text-[#0F1111]">{existingApplication.storeName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#565959]">Submission Date:</span>
              <span className="text-[#0F1111]">{new Date(existingApplication.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-[#565959]">
            Once approved by the Admin, your official <strong>Unique Merchant ID</strong> (e.g. <code>VYN-SELLER-XXXXX</code>) will be issued and you can start listing products immediately.
          </div>

          <div className="pt-4">
            <Link
              href="/"
              className="inline-block px-6 py-2.5 rounded-xl bg-[#0F1111] text-white font-bold text-xs hover:bg-[#232F3E] transition-all"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success State after form submission
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-emerald-300 p-8 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Application Submitted
            </span>
            <h1 className="text-2xl font-headline font-bold text-[#0F1111]">
              Welcome to Vyntra Seller Central!
            </h1>
            <p className="text-sm text-[#565959] leading-relaxed">
              Your seller onboarding application for <strong className="text-[#0F1111]">{storeName}</strong> has been received successfully.
            </p>
          </div>

          <div className="bg-[#F0FDF4] border border-emerald-200 rounded-xl p-5 text-left space-y-2.5 text-xs text-[#0F1111]">
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-[#565959]">Application Reference ID:</span>
              <span className="font-mono font-extrabold text-[#007185] text-sm">
                {submissionSuccess.application?.id ? `APP-VND-${submissionSuccess.application.id.slice(-6).toUpperCase()}` : 'APP-VND-PENDING'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-100">
              <span className="text-[#565959]">Storefront Name:</span>
              <span className="font-bold">{storeName}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#565959]">Next Step:</span>
              <span className="text-emerald-800 font-semibold">Admin Verification in Progress</span>
            </div>
          </div>

          <p className="text-xs text-[#565959]">
            The platform administrator will review your GSTIN, PAN, and Bank details in the Admin Governance Queue. Upon approval, your <strong>Unique Vyntra Merchant Token</strong> will be assigned.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-xl bg-[#0F1111] text-white font-bold text-xs hover:bg-[#232F3E] transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F8] text-[#0F1111]">
      {/* Hero Header */}
      <div className="bg-[#131921] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-white/10">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#FFD814]/10 border border-[#FFD814]/30 text-[#FFD814] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Official Seller Central Onboarding
          </div>
          <h1 className="text-3xl sm:text-4xl font-headline font-extrabold tracking-tight">
            Sell on Vyntra • Grow Your Business Across India
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of verified artisan guilds, fashion designers, and authorized brands. Access high-value shoppers with automated weekly payouts.
          </p>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-left">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <div className="text-[#FFD814] font-bold text-sm">0% Listing Fee</div>
              <div className="text-[11px] text-white/70">List unlimited products without upfront cost.</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <div className="text-[#FFD814] font-bold text-sm">Automated Payouts</div>
              <div className="text-[11px] text-white/70">Weekly direct bank account settlements.</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <div className="text-[#FFD814] font-bold text-sm">Pan-India Reach</div>
              <div className="text-[11px] text-white/70">Courier pickup directly from your doorstep.</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
              <div className="text-[#FFD814] font-bold text-sm">Amazon-Style Tools</div>
              <div className="text-[11px] text-white/70">A+ Content, swatches &amp; Pathfinder categories.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {existingApplication?.status === 'REJECTED' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Application Needs Revision &bull; Resubmission Allowed</span>
              </div>
              <p className="text-xs text-amber-800">
                Your previous onboarding application for <strong>{existingApplication.storeName}</strong> was reviewed by administration with notes.
              </p>
              {existingApplication.rejectionReason && (
                <div className="p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs font-medium text-amber-900">
                  <span className="font-bold text-rose-700">Administrator Feedback:</span> &ldquo;{existingApplication.rejectionReason}&rdquo;
                </div>
              )}
              <p className="text-[11px] text-amber-700">
                Please update your business compliance details below and resubmit. Your revised submission will be sent to the Admin queue for immediate verification.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Store & Contact Details */}
          <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#D5D9D9]">
              <Store className="w-5 h-5 text-[#007185]" />
              <div>
                <h2 className="text-base font-bold text-[#0F1111]">1. Storefront &amp; Business Contact</h2>
                <p className="text-xs text-[#565959]">This is the name customers will see on product cards as &quot;Sold by&quot;.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Storefront / Merchant Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g., Tarun Store, FabHeritage Couture, Urban Luxe"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Owner / Authorized Signatory Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g., Tarun Gupta"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Business Email ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="e.g., store@example.com"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Dispatch Contact Mobile Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">Store Description / Brand Craft Profile</label>
                <textarea
                  rows={2}
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  placeholder="Tell shoppers about your craft, boutique specialty, or fashion heritage..."
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Tax & Legal Compliance */}
          <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#D5D9D9]">
              <FileText className="w-5 h-5 text-[#007185]" />
              <div>
                <h2 className="text-base font-bold text-[#0F1111]">2. Legal &amp; Tax Compliance</h2>
                <p className="text-xs text-[#565959]">Required by Government of India regulations for e-commerce operators.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  PAN Card Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., ABCDE1234F"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white uppercase font-mono tracking-wider font-semibold"
                />
                <p className="text-[11px] text-[#565959]">10-digit Permanent Account Number of proprietor or company.</p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  GSTIN Number (Optional for artisan exemption)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., 27AAPFU0939F1ZV"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white uppercase font-mono tracking-wider"
                />
                <p className="text-[11px] text-[#565959]">15-digit Goods and Services Tax Identification Number.</p>
              </div>
            </div>
          </section>

          {/* Section 3: Bank Account Details for Payouts */}
          <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#D5D9D9]">
              <CreditCard className="w-5 h-5 text-[#007185]" />
              <div>
                <h2 className="text-base font-bold text-[#0F1111]">3. Bank Account for Weekly Payouts</h2>
                <p className="text-xs text-[#565959]">Your sales revenue will be settled into this account automatically every week.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Bank Account Holder Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="Name as registered with bank"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Bank Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., HDFC Bank, SBI, ICICI Bank, Axis Bank"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Bank Account Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter full bank account number"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Re-enter Account Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm account number"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Bank IFSC Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g., HDFC0001234, SBIN0000456"
                  className="w-full sm:w-1/2 px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white uppercase font-mono tracking-wider font-semibold"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Registered Pickup Address */}
          <section className="bg-white rounded-2xl border border-[#D5D9D9] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#D5D9D9]">
              <MapPin className="w-5 h-5 text-[#007185]" />
              <div>
                <h2 className="text-base font-bold text-[#0F1111]">4. Registered Pickup Location</h2>
                <p className="text-xs text-[#565959]">Vyntra logistics couriers will pick up packages from this address.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  Street Address / Studio / Workshop <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Flat/Building No., Street Name, Area/Locality"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              {/* Pincode with Auto-Detect City & State */}
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0F1111]">
                    Postal Pincode <span className="text-rose-600">*</span>
                  </label>
                  {isFetchingPincode && (
                    <span className="text-[10px] text-[#007185] font-semibold flex items-center gap-1 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Auto-detecting City &amp; State...
                    </span>
                  )}
                  {pincodeSuccess && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Location auto-filled: {city ? `${city}, ` : ''}{state}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="Enter 6-digit Pincode (e.g. 302001, 110001, 400001)"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white font-mono tracking-wider font-semibold"
                />
                <p className="text-[11px] text-[#565959]">
                  6-digit Pincode daalte hi aapka City aur State automatically fetch ho jayega.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  City / Town <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Jaipur, Mumbai, Varanasi"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0F1111]">
                  State <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g., Rajasthan, Maharashtra, Uttar Pradesh"
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D5D9D9] focus:outline-none focus:border-[#007185] bg-white"
                />
              </div>
            </div>
          </section>

          {/* Agreement & Mandatory Declaration */}
          <div className={`rounded-2xl border p-6 shadow-sm space-y-4 transition-all ${
            agreedTerms 
              ? 'bg-emerald-50/40 border-emerald-300' 
              : 'bg-white border-[#D5D9D9]'
          }`}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-[#D5D9D9] text-[#007185] focus:ring-[#007185] cursor-pointer shrink-0"
              />
              <span className="text-xs text-[#0F1111] leading-relaxed">
                I hereby declare that the GSTIN, PAN, and Bank details provided above are authentic and belong to my business. I agree to the{' '}
                <Link href="/support" target="_blank" className="text-[#007185] font-bold underline hover:text-[#004B57]">
                  Vyntra Marketplace Seller Agreement
                </Link>{' '}
                and platform commission policies.
              </span>
            </label>

            {!agreedTerms && (
              <p className="text-[11px] text-amber-700 font-semibold pl-8">
                * Please click and accept the declaration above to unlock the submit button.
              </p>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E7E7E7]">
              <div className="flex items-center gap-2 text-xs text-[#565959]">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>256-Bit Bank-Grade SSL Encrypted Submission</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !agreedTerms}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!agreedTerms ? 'Please check the declaration checkbox to enable submission' : undefined}
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Seller Application →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

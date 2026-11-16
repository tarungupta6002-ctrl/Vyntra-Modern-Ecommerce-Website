'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Truck,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle,
  AlertCircle,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { createClient } from '@/lib/supabase/client';
import { useUserProfileStore } from '@/store/user-profile-store';
import { useCartStore } from '@/store/cart-store';

type AuthMode = 'mobile' | 'otp' | 'email' | 'signup';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'info' | 'error';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '/';
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'mobile';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nameError, setNameError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [otpTarget, setOtpTarget] = useState<'mobile' | 'email'>('mobile');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'info',
  });
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const hideNotification = () => {
    setToast((prev) => ({ ...prev, show: false }));
  };

  // Resend timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, resendTimer]);

  // Clean phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (rawValue.length <= 10) {
      setPhoneNumber(rawValue);
      if (phoneError) setPhoneError('');
    }
  };

  const clearPhone = () => {
    setPhoneNumber('');
    setPhoneError('');
  };

  // Submit Mobile Number -> proceed to OTP
  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setIsLoading(true);
    setPhoneError('');

    setTimeout(() => {
      setIsLoading(false);
      setMode('otp');
      setResendTimer(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      showNotification(`Sending 6-digit OTP to +91 ${phoneNumber}...`, 'info');
      // Focus first OTP field after transition
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    }, 600);
  };

  // Handle individual OTP inputs
  const handleOtpChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanDigit;
    setOtp(newOtp);

    // Auto-advance
    if (cleanDigit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasteData.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Verify OTP (Email OTP for Signup or SMS OTP for Mobile)
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      showNotification('Please enter the complete 6-digit verification code', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();

      if (otpTarget === 'email') {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: enteredOtp,
          type: 'email',
        });

        if (error) {
          showNotification(error.message, 'error');
          setIsLoading(false);
          return;
        }

        if (data.session) {
          // Sync to Prisma public.User only AFTER successful email verification
          try {
            await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                name: fullName.trim() || data.user?.user_metadata?.full_name,
                phone: `+91 ${phoneNumber}`,
              }),
            });
          } catch (syncErr) {
            console.warn('[Sync Error]:', syncErr);
          }

          useUserProfileStore.getState().updateProfile({
            fullName: fullName.trim() || data.user?.user_metadata?.full_name || email.split('@')[0],
            email: email.trim(),
            phone: `+91 ${phoneNumber}`,
          });

          showNotification('Email verified successfully! Welcome to VYNTRA.', 'success');
          const target = getSafeRedirect(redirectParam);
          setTimeout(() => {
            router.push(target);
            router.refresh();
          }, 800);
        } else {
          showNotification('Email verified! You can now sign in with your credentials.', 'success');
          setIsLoading(false);
          setMode('email');
        }
      } else {
        // Mobile OTP fallback
        const formattedPhone = `+91${phoneNumber}`;
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: enteredOtp,
          type: 'sms',
        });

        if (error) {
          showNotification(error.message, 'error');
          setIsLoading(false);
          return;
        }

        if (data.session) {
          try {
            await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`,
              },
              credentials: 'include',
            });
          } catch (syncErr) {
            console.warn('[Sync Error]:', syncErr);
          }
          showNotification('Mobile verification successful!', 'success');
          const target = getSafeRedirect(redirectParam);
          setTimeout(() => {
            router.push(target);
            router.refresh();
          }, 600);
        }
      }
    } catch (err: any) {
      showNotification(err.message || 'Verification failed. Please verify and try again.', 'error');
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      if (otpTarget === 'email') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });
        if (error) {
          showNotification(error.message, 'error');
        } else {
          setResendTimer(30);
          setCanResend(false);
          setOtp(['', '', '', '', '', '']);
          showNotification(`New 6-digit verification code sent to ${email.trim()}`, 'info');
          otpRefs.current[0]?.focus();
        }
      } else {
        const formattedPhone = `+91${phoneNumber}`;
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) {
          showNotification(error.message, 'error');
        } else {
          setResendTimer(30);
          setCanResend(false);
          setOtp(['', '', '', '', '', '']);
          showNotification(`New 6-digit OTP sent to +91 ${phoneNumber}`, 'info');
          otpRefs.current[0]?.focus();
        }
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to resend code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getSafeRedirect = (url: string | null) => {
    if (
      !url ||
      !url.startsWith('/') ||
      url.startsWith('//') ||
      url.startsWith('/\\') ||
      url.startsWith('\\') ||
      url.includes(':') ||
      url.includes('//')
    ) {
      return '/account';
    }
    return url;
  };

  // Submit Email Login
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      hasErr = true;
    } else {
      setEmailError('');
    }

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasErr = true;
    } else {
      setPasswordError('');
    }

    if (hasErr) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          showNotification('Please confirm your email address before signing in. Check your inbox.', 'info');
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          showNotification('Invalid email or password. Please verify and try again.', 'error');
        } else {
          showNotification(error.message, 'error');
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Synchronize with public.User in database
        try {
          const syncHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          if (data.session?.access_token) {
            syncHeaders['Authorization'] = `Bearer ${data.session.access_token}`;
          }
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: syncHeaders,
            credentials: 'include',
            body: JSON.stringify({
              name: data.user.user_metadata?.full_name || email.split('@')[0],
              phone: data.user.user_metadata?.phone,
            }),
          });
        } catch (syncErr) {
          console.warn('[Sync Error]:', syncErr);
        }

        // Update Zustand client profile state
        useUserProfileStore.getState().updateProfile({
          email: data.user.email || email,
          fullName: data.user.user_metadata?.full_name || email.split('@')[0],
        });

        // Merge guest cart with persistent database cart upon login, then sync verified DB cart
        await useCartStore.getState().mergeGuestCart();
        await useCartStore.getState().syncWithDatabase();

        showNotification('Signed in successfully! Redirecting...', 'success');
        const target = getSafeRedirect(redirectParam);
        setTimeout(() => {
          router.push(target);
          router.refresh();
        }, 600);
      }
    } catch (err: any) {
      showNotification(err.message || 'An unexpected error occurred during sign in.', 'error');
      setIsLoading(false);
    }
  };

  // Submit Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    if (!fullName.trim()) {
      setNameError('Please enter your full name');
      hasErr = true;
    } else {
      setNameError('');
    }

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address for account security');
      hasErr = true;
    } else {
      setEmailError('');
    }

    if (phoneNumber.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      hasErr = true;
    } else {
      setPhoneError('');
    }

    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasErr = true;
    } else {
      setPasswordError('');
    }

    if (hasErr) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const formattedPhone = `+91 ${phoneNumber}`;
      const callbackUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(getSafeRedirect(redirectParam))}`
        : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: formattedPhone,
          },
          ...(callbackUrl ? { emailRedirectTo: callbackUrl } : {}),
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          showNotification('An account with this email already exists. Please sign in.', 'error');
          setMode('email');
        } else {
          showNotification(error.message, 'error');
        }
        setIsLoading(false);
        return;
      }

      // Check if session was created immediately (email confirmation disabled in Supabase)
      if (data.session) {
        try {
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({ name: fullName.trim(), phone: formattedPhone }),
          });
        } catch (syncErr) {
          console.warn('[Sync Error]:', syncErr);
        }

        useUserProfileStore.getState().updateProfile({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: formattedPhone,
        });

        showNotification('Account created successfully! Welcome to VYNTRA.', 'success');
        const target = getSafeRedirect(redirectParam);
        setTimeout(() => {
          router.push(target);
          router.refresh();
        }, 800);
      } else if (data.user) {
        // Email confirmation is required by Supabase project settings
        showNotification(
          `Confirmation email sent to ${email.trim()}! Please check your inbox and click the verification link to activate your account.`,
          'info'
        );
        setIsLoading(false);
        setMode('email');
      }
    } catch (err: any) {
      showNotification(err.message || 'An error occurred during account creation.', 'error');
      setIsLoading(false);
    }
  };

  // Password Reset Handler
  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter your email above to receive a reset link');
      showNotification('Please enter your email address above first.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account/profile`,
      });
      if (error) {
        showNotification(error.message, 'error');
      } else {
        showNotification(`Password reset instructions sent to ${email}.`, 'success');
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to send reset link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Social Login Mock
  const triggerSocialAuth = (provider: string) => {
    showNotification(`Initiating secure authentication with ${provider}...`, 'info');
    setTimeout(() => {
      showNotification(`Connected via ${provider}. Welcome to VYNTRA!`, 'success');
      try {
        localStorage.setItem(
          'vyntra-user',
          JSON.stringify({
            name: `${provider} Patron`,
            provider,
            isLoggedIn: true,
          })
        );
      } catch (err) {
        // Storage ignore
      }
      setTimeout(() => {
        router.push(redirectParam);
      }, 1200);
    }, 1000);
  };

  return (
    <div className="-mt-24 lg:-mt-36 min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col justify-between selection:bg-primary-fixed selection:text-on-primary">
      {/* Top Standalone Auth Header */}
      <header className="w-full pt-8 pb-4 flex flex-col items-center justify-center relative px-4">
        {/* Back to store navigation */}
        <Link
          href={redirectParam}
          className="absolute left-4 sm:left-8 top-8 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-surface-container"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Return to Store</span>
        </Link>

        <div className="flex items-center gap-3">
          <BrandLogo className="h-9 w-auto" />
        </div>
        <p className="mt-1.5 text-xs tracking-wider uppercase font-semibold text-on-surface-variant">
          Curated Marketplace &amp; Festive Living
        </p>
      </header>

      {/* Main Authentication Split Card */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 my-auto py-6">
        <div className="flex flex-col w-full max-w-5xl mx-auto px-2 py-2 sm:py-6 transition-all">
          <div className="w-full bg-white rounded-lg shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] border border-[#D5D9D9]">
            {/* Left Column: Editorial & Festive Artisanal Storytelling (5 Cols) */}
            <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-8 xl:p-10 overflow-hidden bg-[#131921] text-white">
              {/* Background Ambient Visual from Stitch */}
              <div
                className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-35 transform scale-105 transition-transform duration-1000 hover:scale-100"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_0LZ7Sn5U7z_yEeKqkui9mSUL178rzVSRYw_-hBROCxmQlDSNKp-wJVYb5aAVhqKj5LzloQpF3SKNc5ISfAVtBeOoqyMIA0ekAOxOMwJxiWYfJBqXIobwCu2VR-lFBtnPMqwg6ptWJVnwZ8XmXbPN16hHJULpC3Zuk4kV5IOjfCe-_q4vZTFFO5ETSoBf7zBCuRrCfl6SjtFwuU12iIA7_MTwu3GYjrHEW_gbEKY')`,
                }}
              />

              {/* Gradient Scrim for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#131921] via-[#232F3E]/85 to-transparent" />

              {/* Top Badge */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary-container/20 backdrop-blur-md text-secondary-fixed text-xs font-semibold tracking-wide border border-secondary-container/30">
                  <Sparkles className="h-3.5 w-3.5 text-secondary-container" />
                  <span>Festive Curation 2025</span>
                </div>
                <span className="text-xs uppercase tracking-widest text-primary-fixed-dim font-mono font-medium">
                  Edition 08
                </span>
              </div>

              {/* Center Editorial Quote & Stats */}
              <div className="relative z-10 my-auto py-8">
                <div className="w-10 h-1 bg-secondary-container mb-6 rounded-full" />
                <h2 className="font-headline text-3xl xl:text-4xl font-extrabold tracking-tight leading-snug text-white mb-4">
                  Celebrate India’s Finest Craftsmanship
                </h2>
                <p className="font-body text-sm text-primary-fixed-dim leading-relaxed max-w-sm">
                  Discover over 4,500 master weavers, heritage jewelers, and avant-garde couture labels hand-picked for festive living.
                </p>

                {/* Artisanal Highlight Stats */}
                <div className="grid grid-cols-3 gap-3 mt-8 pt-6 bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/10">
                  <div className="flex flex-col">
                    <span className="font-headline font-bold text-lg text-white">100%</span>
                    <span className="text-[10px] text-primary-fixed-dim uppercase tracking-wider mt-0.5">
                      Authentic
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-white/15 pl-3">
                    <span className="font-headline font-bold text-lg text-white">24 Hr</span>
                    <span className="text-[10px] text-primary-fixed-dim uppercase tracking-wider mt-0.5">
                      Dispatch
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-white/15 pl-3">
                    <span className="font-headline font-bold text-lg text-white">4.9 ★</span>
                    <span className="text-[10px] text-primary-fixed-dim uppercase tracking-wider mt-0.5">
                      Top Rated
                    </span>
                  </div>
                </div>
              </div>

              {/* Testimonial Footer */}
              <div className="relative z-10 pt-4 bg-surface-container-lowest/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-surface font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                    AR
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/95 italic line-clamp-2">
                      “The handwoven Chanderi kurta exceeded expectations. Pure regal luxury with seamless doorstep delivery.”
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] font-semibold text-primary-fixed-dim">
                        Ananya Roy, New Delhi
                      </span>
                      <span className="inline-flex items-center gap-1 text-secondary-fixed text-[10px] font-medium">
                        <CheckCircle className="h-3 w-3 text-secondary-container" />
                        Verified Patron
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Authentication Card & Interactive Controls (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 xl:p-12 bg-surface-container-lowest">
              <div>
                {/* Header Branding for Mobile & Desktop */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-headline font-black text-lg shadow-sm">
                      V
                    </div>
                    <span className="font-headline font-extrabold text-xl tracking-tight text-primary">
                      VYNTRA
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary bg-secondary-fixed/50 px-2.5 py-1 rounded-full border border-secondary-container/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
                    Festive Access Active
                  </span>
                </div>

                {/* Dynamic Greeting Block */}
                <div className="mb-6">
                  <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                    {mode === 'mobile' && 'Welcome to VYNTRA'}
                    {mode === 'otp' && 'Verify Mobile Number'}
                    {mode === 'email' && 'Welcome Back'}
                    {mode === 'signup' && 'Create Your Account'}
                  </h1>
                  <p className="font-body text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                    {mode === 'mobile' &&
                      'Login or Sign Up to access your orders, wishlist & exclusive festive offers.'}
                    {mode === 'otp' && (
                      <span>
                        Enter the 6-digit verification code sent to{' '}
                        <strong className="text-on-surface">+91 {phoneNumber}</strong>
                      </span>
                    )}
                    {mode === 'email' &&
                      'Sign in using your registered email address and secure password.'}
                    {mode === 'signup' &&
                      'Join over 1.2M patrons discovering India’s finest artisanal living.'}
                  </p>
                </div>

                {/* 1. Mobile Number Form (Default from Stitch) */}
                {mode === 'mobile' && (
                  <form className="space-y-4" onSubmit={handleMobileSubmit}>
                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-2"
                        htmlFor="mobile-input"
                      >
                        Mobile Number
                      </label>
                      <div className="relative flex items-center rounded-xl bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20 border border-outline-variant/40">
                        {/* Indian Flag & +91 prefix container */}
                        <div className="flex items-center gap-1.5 pl-3.5 pr-2.5 py-3 shrink-0 cursor-default select-none">
                          {/* Indian Flag Micro SVG */}
                          <svg
                            className="w-5 h-3.5 rounded-[2px] shadow-sm overflow-hidden"
                            viewBox="0 0 900 600"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect width="900" height="200" fill="#FF9933" />
                            <rect y="200" width="900" height="200" fill="#FFFFFF" />
                            <rect y="400" width="900" height="200" fill="#138808" />
                            <circle cx="450" cy="300" r="80" fill="none" stroke="#000080" strokeWidth="8" />
                            <circle cx="450" cy="300" r="15" fill="#000080" />
                          </svg>
                          <span className="text-xs font-semibold text-on-surface font-body">+91</span>
                          <ChevronDown className="h-3.5 w-3.5 text-outline" />
                        </div>

                        {/* Hairline Divider */}
                        <div className="h-6 w-[1px] bg-outline-variant/60" />

                        {/* Phone Input */}
                        <input
                          id="mobile-input"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          placeholder="Enter 10-digit mobile number"
                          className="w-full bg-transparent py-3 px-3 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none tracking-wide"
                          autoFocus
                          required
                        />

                        {/* Clear button */}
                        {phoneNumber.length > 0 && (
                          <button
                            type="button"
                            onClick={clearPhone}
                            className="p-2 pr-3 text-outline hover:text-on-surface transition-colors"
                            aria-label="Clear mobile number"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {phoneError && (
                        <p className="text-xs text-error mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    {/* Submit CTA */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full py-2.5 px-6 rounded-md bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Continue with Mobile Number</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 2. OTP Verification State */}
                {mode === 'otp' && (
                  <form className="space-y-5" onSubmit={handleOtpSubmit}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-on-surface-variant uppercase tracking-wider">
                        Enter 6-Digit OTP
                      </span>
                      <button
                        type="button"
                        onClick={() => setMode('mobile')}
                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        Edit Number
                      </button>
                    </div>

                    {/* 6 Digit Input Boxes */}
                    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-11 sm:w-12 h-12 sm:h-14 text-center text-lg font-headline font-bold text-on-surface rounded-xl bg-surface-container-low border border-outline-variant/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all shadow-sm"
                        />
                      ))}
                    </div>

                    {/* Resend OTP Row */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-on-surface-variant">
                        Didn&apos;t receive code?{' '}
                        {resendTimer > 0 ? (
                          <span className="font-semibold text-on-surface">Resend in {resendTimer}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            className="font-bold text-primary hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </span>
                      <span className="text-[11px] text-outline">Simulated OTP: Any 6 digits</span>
                    </div>

                    {/* Verify CTA */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full py-2.5 px-6 rounded-md bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify &amp; Proceed</span>
                          <Check className="h-4 w-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 3. Email & Password Form */}
                {mode === 'email' && (
                  <form className="space-y-4" onSubmit={handleEmailSubmit}>
                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-2"
                        htmlFor="email-input"
                      >
                        Email Address
                      </label>
                      <input
                        id="email-input"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        placeholder="patron@example.com"
                        className="w-full bg-surface-container-low rounded-xl py-3 px-3.5 text-sm font-body text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/40 focus:outline-none"
                        autoFocus
                        required
                      />
                      {emailError && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{emailError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface"
                          htmlFor="password-input"
                        >
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          id="password-input"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError('');
                          }}
                          placeholder="Enter your password"
                          className="w-full bg-surface-container-low rounded-xl py-3 pl-3.5 pr-10 text-sm font-body text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/40 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-outline hover:text-on-surface transition-colors p-1"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{passwordError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full py-2.5 px-6 rounded-md bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Sign In with Email</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* 4. Sign Up Mode */}
                {mode === 'signup' && (
                  <form className="space-y-3.5" onSubmit={handleSignupSubmit}>
                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5"
                        htmlFor="name-input"
                      >
                        Full Name
                      </label>
                      <input
                        id="name-input"
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (nameError) setNameError('');
                        }}
                        placeholder="e.g. Ananya Roy"
                        className="w-full bg-surface-container-low rounded-xl py-2.5 px-3.5 text-sm font-body text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/40 focus:outline-none"
                        autoFocus
                        required
                      />
                      {nameError && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{nameError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5"
                        htmlFor="signup-phone"
                      >
                        Mobile Number
                      </label>
                      <div className="relative flex items-center rounded-xl bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20 border border-outline-variant/40">
                        <div className="flex items-center gap-1 pl-3 pr-2 py-2.5 shrink-0 select-none">
                          <span className="text-xs font-semibold text-on-surface font-body">+91</span>
                        </div>
                        <div className="h-5 w-[1px] bg-outline-variant/60" />
                        <input
                          id="signup-phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phoneNumber}
                          onChange={handlePhoneChange}
                          placeholder="10-digit mobile number"
                          className="w-full bg-transparent py-2.5 px-3 text-sm font-body text-on-surface placeholder:text-outline focus:outline-none"
                          required
                        />
                      </div>
                      {phoneError && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5"
                        htmlFor="signup-email"
                      >
                        Email Address (Optional)
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-surface-container-low rounded-xl py-2.5 px-3.5 text-sm font-body text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/40 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        className="block font-label text-xs font-semibold uppercase tracking-wider text-on-surface mb-1.5"
                        htmlFor="signup-pass"
                      >
                        Create Password
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="signup-pass"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError('');
                          }}
                          placeholder="At least 6 characters"
                          className="w-full bg-surface-container-low rounded-xl py-2.5 pl-3.5 pr-10 text-sm font-body text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 border border-outline-variant/40 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-outline hover:text-on-surface transition-colors p-1"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="text-xs text-error mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{passwordError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group w-full py-2.5 px-6 rounded-md bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70 mt-2"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Create Account &amp; Continue</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Divider with Text */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full bg-surface-container-high h-[1px]" />
                  </div>
                  <span className="relative px-3 bg-surface-container-lowest text-[11px] font-semibold uppercase tracking-wider text-outline">
                    Or continue with
                  </span>
                </div>

                {/* Social & Alternate Options */}
                <div className="space-y-3">
                  {/* Google Auth Button */}
                  <button
                    type="button"
                    onClick={() => triggerSocialAuth('Google')}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all text-on-surface font-body text-xs sm:text-sm font-medium shadow-sm hover:shadow active:scale-[0.99] border border-outline-variant/40"
                  >
                    {/* Google Official Logo Vector */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Mode Switching Secondary Links */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    {mode !== 'email' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('email');
                          setPhoneError('');
                        }}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Login using Email ID</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('mobile');
                          setEmailError('');
                          setPasswordError('');
                        }}
                        className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline transition-colors"
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>Login with Mobile Number</span>
                      </button>
                    )}

                    {mode !== 'signup' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setPhoneError('');
                        }}
                        className="font-semibold text-secondary hover:text-secondary-container transition-colors"
                      >
                        New to VYNTRA? Sign Up
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('mobile');
                          setNameError('');
                          setPhoneError('');
                          setPasswordError('');
                        }}
                        className="font-semibold text-primary hover:underline transition-colors"
                      >
                        Already registered? Sign In
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer & Trust Credentials */}
              <div className="pt-6 mt-6 border-t border-surface-container-high/60 space-y-4">
                {/* Legal disclaimer */}
                <p className="text-[11px] leading-relaxed text-center text-outline">
                  By continuing, you agree to VYNTRA’s{' '}
                  <Link href="/terms" className="text-primary hover:underline font-medium">
                    Terms of Use
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Trust Row */}
                <div className="flex items-center justify-center flex-wrap gap-y-2 gap-x-4 text-[11px] text-on-surface-variant font-medium pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3 text-primary" />
                    256-bit Encryption
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    100% Genuine Brands
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Instant OTP Login
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Credentials */}
      <footer className="w-full py-8 mt-auto flex flex-col items-center justify-center gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center flex-wrap justify-center gap-6">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="font-medium">100% Genuine Products</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Lock className="h-4 w-4 text-primary" />
            <span className="font-medium">256-bit Secure Encryption</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <Truck className="h-4 w-4 text-primary" />
            <span className="font-medium">Express Assured Delivery</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-outline mt-1">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/support" className="hover:text-primary transition-colors">
            Help Center
          </Link>
        </div>

        <p className="text-[11px] text-outline">
          © {new Date().getFullYear()} VYNTRA Marketplace Inc. All rights reserved.
        </p>
      </footer>

      {/* Notification Toast for Micro-interactions */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 transform transition-all duration-300 bg-on-surface text-surface px-4 py-3 rounded-xl shadow-2xl text-xs z-50 flex items-center gap-2.5 max-w-sm border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="h-4 w-4 text-secondary-container shrink-0" />}
          <span className="flex-1 font-medium leading-relaxed">{toast.message}</span>
          <button
            onClick={hideNotification}
            className="text-surface/70 hover:text-surface ml-1 p-0.5 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

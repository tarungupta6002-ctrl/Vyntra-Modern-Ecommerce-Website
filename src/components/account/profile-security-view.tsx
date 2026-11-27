'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_HINT, passwordProblem } from '@/lib/password-rules';
import { useUserProfileStore } from '@/store/user-profile-store';

interface ProfileSecurityViewProps {
  embeddedInAccount?: boolean;
}

interface Profile {
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

type FieldKey = 'name' | 'phone';

const inputClass =
  'w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20';

async function readJson(res: Response) {
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error?.message || 'Something went wrong. Please try again.');
  return json.data;
}

function formatPhone(phone: string | null) {
  if (!phone) return null;
  return phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

/**
 * Login & security. Everything here is real: name and phone are saved to the account,
 * the password is changed in Supabase Auth, and sign-out ends real sessions.
 */
export function ProfileSecurityView({ embeddedInAccount = false }: ProfileSecurityViewProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usesPassword, setUsesPassword] = useState(true);

  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdDone, setPwdDone] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [signingOut, setSigningOut] = useState<null | 'local' | 'global'>(null);

  useEffect(() => {
    fetch('/api/account/profile', { cache: 'no-store' })
      .then(readJson)
      .then((d) => setProfile(d.user))
      .catch((e) => setLoadError(e.message));
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const meta = data.user?.app_metadata;
        const providers: string[] = meta?.providers || (meta?.provider ? [meta.provider] : []);
        setUsesPassword(providers.length === 0 || providers.includes('email'));
      })
      .catch(() => {});
  }, []);

  const startEdit = (key: FieldKey) => {
    if (!profile) return;
    setEditing(key);
    setDraft(key === 'name' ? profile.name : profile.phone || '');
    setFieldError(null);
    setSaved(null);
  };

  const saveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingField(true);
    setFieldError(null);
    try {
      const data = await readJson(
        await fetch('/api/account/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [editing]: draft }),
        })
      );
      setProfile(data.user);
      useUserProfileStore.getState().updateProfile({ fullName: data.user.name, phone: data.user.phone || '' });
      setSaved(editing === 'name' ? 'Name updated.' : data.user.phone ? 'Mobile number updated.' : 'Mobile number removed.');
      setEditing(null);
      router.refresh();
    } catch (err: any) {
      setFieldError(err.message);
    } finally {
      setSavingField(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdDone(false);
    if (!profile) return;
    if (!currentPwd) return setPwdError('Enter your current password.');
    const issue = passwordProblem(newPwd);
    if (issue) return setPwdError(issue);
    if (newPwd !== confirmPwd) return setPwdError("New passwords don't match.");
    if (newPwd === currentPwd) return setPwdError('New password must be different from the current one.');

    setChangingPwd(true);
    try {
      const supabase = createClient();
      // Supabase does not check the old password on update, so confirm it first.
      const check = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPwd });
      if (check.error) throw new Error('Current password is incorrect.');
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw new Error(error.message);
      // Sign out every other device that was using the old password.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdDone(true);
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setChangingPwd(false);
    }
  };

  const signOut = async (scope: 'local' | 'global') => {
    setSigningOut(scope);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope });
      await fetch('/api/auth/logout', { method: 'POST' });
      useUserProfileStore.getState().resetToDefault();
      router.push('/');
      router.refresh();
    } catch {
      setSigningOut(null);
    }
  };

  if (loadError) {
    return (
      <div className="rounded-xl border border-[#D5D9D9] bg-white p-6 text-sm text-[#0F1111]">
        {loadError === 'Unauthenticated.' || /auth/i.test(loadError) ? (
          <>
            <Link href="/login?redirect=/account?tab=profile" className="font-semibold text-[#007185] hover:underline">
              Sign in
            </Link>{' '}
            to manage your account.
          </>
        ) : (
          loadError
        )}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-[#565959]">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your account…
      </div>
    );
  }

  const rows: { key: FieldKey | 'email'; label: string; value: string | null; hint?: React.ReactNode }[] = [
    { key: 'name', label: 'Name', value: profile.name },
    {
      key: 'email',
      label: 'Email',
      value: profile.email,
      hint: (
        <>
          Used to sign in and for order emails. To change it,{' '}
          <Link href="/support?topic=ACCOUNT#support-contact-form" className="text-[#007185] hover:underline">
            contact Customer Service
          </Link>
          .
        </>
      ),
    },
    { key: 'phone', label: 'Mobile number', value: formatPhone(profile.phone), hint: 'Optional. Sellers and couriers may use it to reach you about a delivery.' },
  ];

  return (
    <div className="w-full max-w-3xl space-y-6 text-[#0F1111]" id="profile-security">
      <div>
        <h1 className={`${embeddedInAccount ? 'text-xl' : 'text-2xl'} font-bold`}>Login &amp; security</h1>
        <p className="mt-1 text-sm text-[#565959]">
          Customer since {new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          <CheckCircle2 className="h-4 w-4" /> {saved}
        </div>
      )}

      {/* Profile details */}
      <section className="overflow-hidden rounded-xl border border-[#D5D9D9] bg-white" aria-label="Profile details">
        <ul className="divide-y divide-[#E3E6E6]">
          {rows.map((row) => (
            <li key={row.key} className="px-5 py-4">
              {editing === row.key ? (
                <form onSubmit={saveField} className="space-y-2">
                  <label htmlFor={`profile-${row.key}`} className="text-sm font-semibold">
                    {row.label}
                  </label>
                  <input
                    id={`profile-${row.key}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    inputMode={row.key === 'phone' ? 'numeric' : undefined}
                    autoComplete={row.key === 'phone' ? 'tel-national' : 'name'}
                    placeholder={row.key === 'phone' ? '10-digit mobile number' : undefined}
                    maxLength={row.key === 'phone' ? 14 : 80}
                    className={`${inputClass} max-w-sm`}
                    autoFocus
                  />
                  {fieldError && <p className="text-sm text-[#B12704]">{fieldError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingField}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD814] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7CA00] disabled:opacity-60"
                    >
                      {savingField && <Loader2 className="h-4 w-4 animate-spin" />} Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{row.label}</div>
                    <div className="mt-0.5 break-words text-sm">{row.value || <span className="text-[#565959]">Not added</span>}</div>
                    {row.hint && <p className="mt-1 text-xs text-[#565959]">{row.hint}</p>}
                  </div>
                  {row.key !== 'email' && (
                    <button
                      type="button"
                      onClick={() => startEdit(row.key as FieldKey)}
                      className="shrink-0 rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8]"
                    >
                      {row.value ? 'Edit' : 'Add'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Password */}
      <section className="rounded-xl border border-[#D5D9D9] bg-white px-5 py-4" aria-labelledby="password-heading">
        <h2 id="password-heading" className="text-base font-bold">
          Password
        </h2>
        {!usesPassword ? (
          <p className="mt-1 text-sm text-[#565959]">You sign in with a linked account, so there is no Vyntra password to change.</p>
        ) : (
          <form onSubmit={changePassword} className="mt-3 max-w-sm space-y-3" noValidate>
            <div>
              <label htmlFor="pwd-current" className="text-sm font-semibold">
                Current password
              </label>
              <input
                id="pwd-current"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="pwd-new" className="text-sm font-semibold">
                New password
              </label>
              <input
                id="pwd-new"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
              <p className="mt-1 text-xs text-[#565959]">{PASSWORD_HINT}</p>
            </div>
            <div>
              <label htmlFor="pwd-confirm" className="text-sm font-semibold">
                Re-enter new password
              </label>
              <input
                id="pwd-confirm"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="inline-flex items-center gap-1.5 text-sm text-[#007185] hover:underline"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPwd ? 'Hide passwords' : 'Show passwords'}
            </button>
            {pwdError && <p className="text-sm text-[#B12704]">{pwdError}</p>}
            {pwdDone && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-800" role="status">
                <CheckCircle2 className="h-4 w-4" /> Password changed. Other devices have been signed out.
              </p>
            )}
            <button
              type="submit"
              disabled={changingPwd}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD814] px-5 py-2 text-sm font-semibold hover:bg-[#F7CA00] disabled:opacity-60"
            >
              {changingPwd && <Loader2 className="h-4 w-4 animate-spin" />} Change password
            </button>
            <p className="text-xs text-[#565959]">
              Forgot it?{' '}
              <Link href="/login" className="text-[#007185] hover:underline">
                Reset it from the sign-in page
              </Link>
              .
            </p>
          </form>
        )}
      </section>

      {/* Sessions */}
      <section className="rounded-xl border border-[#D5D9D9] bg-white px-5 py-4" aria-labelledby="signout-heading">
        <h2 id="signout-heading" className="text-base font-bold">
          Sign out
        </h2>
        <p className="mt-1 text-sm text-[#565959]">
          If you signed in on a device you no longer use, sign out everywhere. You&apos;ll need to sign in again on every device.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={signingOut !== null}
            onClick={() => signOut('local')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8] disabled:opacity-60"
          >
            {signingOut === 'local' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
          </button>
          <button
            type="button"
            disabled={signingOut !== null}
            onClick={() => signOut('global')}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D9D9] px-4 py-1.5 text-sm font-semibold hover:bg-[#F7F8F8] disabled:opacity-60"
          >
            {signingOut === 'global' && <Loader2 className="h-4 w-4 animate-spin" />} Sign out of all devices
          </button>
        </div>
      </section>

      {/* Close account */}
      <section className="rounded-xl border border-[#D5D9D9] bg-white px-5 py-4" aria-labelledby="close-heading">
        <h2 id="close-heading" className="text-base font-bold">
          Close your account
        </h2>
        <p className="mt-1 text-sm text-[#565959]">
          To close your account or get a copy of your data, send us a request. Open orders and returns must be finished first.
        </p>
        <Link
          href="/support?topic=ACCOUNT#support-contact-form"
          className="mt-3 inline-block text-sm font-semibold text-[#007185] hover:underline"
        >
          Contact Customer Service
        </Link>
      </section>
    </div>
  );
}

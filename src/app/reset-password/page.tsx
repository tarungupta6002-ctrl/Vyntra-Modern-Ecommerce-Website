'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_HINT, passwordProblem } from '@/lib/password-rules';

/**
 * Where the "Forgot password" email lands (via /auth/callback, which signs the user in
 * with the one-time link). The user sets a new password here without the old one.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'no-session' | 'done'>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) {
          setEmail(data.user.email || '');
          setStatus('ready');
        } else {
          setStatus('no-session');
        }
      })
      .catch(() => setStatus('no-session'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const issue = passwordProblem(password);
    if (issue) return setError(issue);
    if (password !== confirm) return setError("Passwords don't match.");
    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    // Anyone else signed in with the old password is signed out; this browser stays signed in.
    if (!updateError) await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
    setSaving(false);
    if (updateError) {
      setError(
        /different from the old/i.test(updateError.message)
          ? 'Choose a password different from your old one.'
          : updateError.message
      );
      return;
    }
    setStatus('done');
    setTimeout(() => {
      router.push('/account');
      router.refresh();
    }, 1500);
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-[#888C8C] bg-white px-3 py-2.5 text-sm focus:border-[#007185] focus:outline-none focus:ring-2 focus:ring-[#007185]/20';

  return (
    <div className="min-h-[70vh] bg-[#F7F8F8] px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-xl border border-[#D5D9D9] bg-white p-6 sm:p-8 text-[#0F1111]">
        <h1 className="text-2xl font-bold">Set a new password</h1>

        {status === 'checking' && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[#565959]">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
          </p>
        )}

        {status === 'no-session' && (
          <div className="mt-3 space-y-3 text-sm">
            <p>
              This reset link has expired or was already used. Links work once, for a limited time, and only in the
              browser where you asked for them.
            </p>
            <Link href="/login" className="inline-block font-semibold text-[#007185] hover:underline">
              Request a new link from the sign-in page
            </Link>
          </div>
        )}

        {status === 'done' && (
          <p className="mt-4 flex items-center gap-2 text-sm text-emerald-800" role="status">
            <CheckCircle2 className="h-4 w-4" /> Password changed and other devices signed out. Taking you to your account…
          </p>
        )}

        {status === 'ready' && (
          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            {email && <p className="text-sm text-[#565959]">For {email}</p>}
            <div>
              <label htmlFor="reset-new" className="text-sm font-semibold">
                New password
              </label>
              <input
                id="reset-new"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoFocus
              />
              <p className="mt-1 text-xs text-[#565959]">{PASSWORD_HINT}</p>
            </div>
            <div>
              <label htmlFor="reset-confirm" className="text-sm font-semibold">
                Re-enter new password
              </label>
              <input
                id="reset-confirm"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="inline-flex items-center gap-1.5 text-sm text-[#007185] hover:underline"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>
            {error && <p className="text-sm text-[#B12704]">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#FFD814] px-5 py-2.5 text-sm font-semibold hover:bg-[#F7CA00] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save new password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

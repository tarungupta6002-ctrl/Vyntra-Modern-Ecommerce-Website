/**
 * Password rules for new passwords (signup, reset, change). These mirror the Supabase Auth
 * settings (Authentication → Sign In / Providers → Email): minimum length 8, and at least
 * one lowercase letter, one uppercase letter and one digit. Keep both in sync.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

/** Returns a message describing what is missing, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  const missing: string[] = [];
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/[0-9]/.test(password)) missing.push('a number');

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters${missing.length ? `, including ${joinList(missing)}` : ''}.`;
  }
  if (missing.length) return `Add ${joinList(missing)}.`;
  return null;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

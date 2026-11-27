import { randomBytes } from 'node:crypto';
import { SupportTicketStatus, SupportTopic } from '@prisma/client';

export const SUPPORT_TOPICS: Record<SupportTopic, string> = {
  ORDER: 'An order',
  DELIVERY: 'Delivery or tracking',
  RETURN_REFUND: 'Return or refund',
  PAYMENT: 'Payment',
  ACCOUNT: 'My account',
  OTHER: 'Something else',
};

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  OPEN: 'Waiting for Vyntra',
  ANSWERED: 'Replied',
  RESOLVED: 'Resolved',
};

export const SUBJECT_MAX = 120;
export const BODY_MIN = 10;
export const BODY_MAX = 4000;

export function isSupportTopic(value: unknown): value is SupportTopic {
  return typeof value === 'string' && value in SUPPORT_TOPICS;
}

/** e.g. "VYN-SUP-261127-K7QD" (date + 4 random characters). */
export function newTicketNumber(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const ymd = ist.toISOString().slice(2, 10).replace(/-/g, '');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(4);
  const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `VYN-SUP-${ymd}-${suffix}`;
}

/** Trims, collapses runs of blank lines and enforces length limits. Returns an error message or the clean text. */
export function cleanBody(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < BODY_MIN) return { ok: false, error: `Please write at least ${BODY_MIN} characters.` };
  if (text.length > BODY_MAX) return { ok: false, error: `Please keep your message under ${BODY_MAX} characters.` };
  return { ok: true, value: text };
}

export function cleanSubject(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (text.length < 4) return { ok: false, error: 'Please add a short subject.' };
  if (text.length > SUBJECT_MAX) return { ok: false, error: `Please keep the subject under ${SUBJECT_MAX} characters.` };
  return { ok: true, value: text };
}

/** Where customer messages are delivered: SUPPORT_EMAIL, else the SMTP account. */
export function supportInbox(): string | null {
  return process.env.SUPPORT_EMAIL || process.env.SMTP_USER || null;
}

/** Contact details that are safe to show publicly. Only configured values are returned. */
export function publicSupportContact() {
  const officerName = process.env.GRIEVANCE_OFFICER_NAME?.trim();
  return {
    email: supportInbox(),
    phone: process.env.SUPPORT_PHONE?.trim() || null,
    hours: process.env.SUPPORT_HOURS?.trim() || null,
    grievanceOfficer: officerName
      ? {
          name: officerName,
          email: process.env.GRIEVANCE_OFFICER_EMAIL?.trim() || supportInbox(),
          designation: process.env.GRIEVANCE_OFFICER_DESIGNATION?.trim() || null,
        }
      : null,
  };
}

import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Transactional email sender. Picks the first configured provider:
 *
 * 1. SMTP (e.g. Gmail): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Gmail needs an App Password).
 * 2. Resend: RESEND_API_KEY (REST API, no SDK dependency).
 * 3. Neither (local development): saves the rendered email to .email-previews/
 *    so it can be opened in a browser, and logs where it went.
 *
 * Never throws: email problems must not break checkout, shipping or cancellation.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Short label for logs and preview file names, e.g. "order-confirmed". */
  tag: string;
}

export type SendResult =
  | { status: 'sent'; id: string }
  | { status: 'previewed'; file: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 5000;

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailFromAddress(): string {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  // Gmail only sends "from" the signed-in account, so default to that address.
  if (smtpConfigured()) return `Vyntra <${process.env.SMTP_USER}>`;
  // Resend's shared test sender works without a verified domain (delivers only to the account owner).
  return 'Vyntra <onboarding@resend.dev>';
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!message.to || !message.to.includes('@')) {
    return { status: 'skipped', reason: 'missing recipient' };
  }

  if (smtpConfigured()) return sendViaSmtp(message);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[email] No SMTP or RESEND_API_KEY configured; "${message.tag}" email to ${maskEmail(message.to)} was not sent.`);
      return { status: 'skipped', reason: 'no email provider configured' };
    }
    return savePreview(message);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [{ name: 'type', value: message.tag.replace(/[^a-zA-Z0-9_-]/g, '_') }],
      }),
      signal: controller.signal,
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = json?.message || `HTTP ${res.status}`;
      console.error(`[email] "${message.tag}" to ${maskEmail(message.to)} failed: ${error}`);
      return { status: 'failed', error };
    }
    return { status: 'sent', id: json?.id || '' };
  } catch (err: any) {
    const error = err?.name === 'AbortError' ? `timed out after ${SEND_TIMEOUT_MS}ms` : err?.message || 'unknown error';
    console.error(`[email] "${message.tag}" to ${maskEmail(message.to)} failed: ${error}`);
    return { status: 'failed', error };
  } finally {
    clearTimeout(timer);
  }
}

// One pooled connection per server process, reused across emails.
let smtpTransport: Transporter | null = null;

function getSmtpTransport(): Transporter {
  if (!smtpTransport) {
    const port = Number(process.env.SMTP_PORT || 465);
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = TLS from the start; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS * 2,
    });
  }
  return smtpTransport;
}

async function sendViaSmtp(message: EmailMessage): Promise<SendResult> {
  try {
    const info = await getSmtpTransport().sendMail({
      from: emailFromAddress(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { 'X-Vyntra-Email-Type': message.tag },
    });
    return { status: 'sent', id: info.messageId || '' };
  } catch (err: any) {
    // Gmail answers 535 when the App Password is wrong or 2-Step Verification is off.
    const error = err?.responseCode === 535
      ? 'SMTP login rejected (check SMTP_USER and the Gmail App Password)'
      : err?.message || 'unknown SMTP error';
    console.error(`[email] "${message.tag}" to ${maskEmail(message.to)} failed via SMTP: ${error}`);
    return { status: 'failed', error };
  }
}

async function savePreview(message: EmailMessage): Promise<SendResult> {
  try {
    const dir = path.join(process.cwd(), '.email-previews');
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(dir, `${stamp}-${message.tag}.html`);
    const header = `<!-- To: ${message.to} | Subject: ${message.subject} -->\n`;
    await fs.writeFile(file, header + message.html, 'utf8');
    console.info(`[email] No RESEND_API_KEY: "${message.subject}" saved to ${file}`);
    return { status: 'previewed', file };
  } catch (err: any) {
    return { status: 'failed', error: `preview save failed: ${err?.message}` };
  }
}

/** a***@gmail.com — keeps logs useful without writing full addresses. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return domain ? `${user.slice(0, 1)}***@${domain}` : '***';
}

import { sendEmail, maskEmail } from '@/lib/email/send';
import { escapeHtml } from '@/lib/email/order-templates';
import { SUPPORT_TOPICS, supportInbox } from './tickets';
import type { SupportTopic } from '@prisma/client';

/**
 * Support ticket emails. All of them are best-effort: sendEmail never throws,
 * and a failed email must not fail the ticket request itself.
 */

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

interface TicketInfo {
  ticketNumber: string;
  subject: string;
  topic: SupportTopic;
  orderNumber?: string | null;
}

function layout(opts: { preheader: string; heading: string; intro: string; quote?: string; cta: { label: string; href: string }; footer: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#F3F4F4;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F4;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E3E6E6;">
      <tr><td style="background:#131921;padding:18px 32px;"><span style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#ffffff;">VYNTRA</span><span style="color:#FEB800;font-size:22px;font-weight:bold;">.</span></td></tr>
      <tr><td style="padding:28px 32px 0;">
        <h1 style="margin:0 0 8px;font-size:22px;line-height:28px;color:#0F1111;">${escapeHtml(opts.heading)}</h1>
        <p style="margin:0;font-size:15px;line-height:22px;color:#0F1111;">${escapeHtml(opts.intro)}</p>
      </td></tr>
      ${opts.quote ? `<tr><td style="padding:18px 32px 0;"><div style="border-left:3px solid #D5D9D9;padding:4px 0 4px 14px;font-size:14px;line-height:21px;color:#0F1111;white-space:pre-wrap;">${escapeHtml(opts.quote)}</div></td></tr>` : ''}
      <tr><td style="padding:22px 32px 0;"><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:#FFD814;color:#0F1111;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px;">${escapeHtml(opts.cta.label)}</a></td></tr>
      <tr><td style="padding:28px 32px;"><div style="border-top:1px solid #E3E6E6;padding-top:16px;font-size:12px;line-height:18px;color:#565959;">${escapeHtml(opts.footer)}</div></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function excerpt(text: string, max = 1200): string {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

function ticketLine(t: TicketInfo): string {
  return `Request ${t.ticketNumber} · ${SUPPORT_TOPICS[t.topic]}${t.orderNumber ? ` · Order ${t.orderNumber}` : ''}`;
}

/** Tells the support inbox that a customer opened a ticket or replied to one. */
export async function notifySupportTeam(
  t: TicketInfo,
  customer: { name: string; email: string },
  message: string,
  kind: 'new' | 'reply'
) {
  const to = supportInbox();
  if (!to) return;
  const href = `${siteUrl()}/admin/support?ticket=${encodeURIComponent(t.ticketNumber)}`;
  const heading = kind === 'new' ? `New support request: ${t.subject}` : `Customer replied: ${t.subject}`;
  const intro = `${customer.name} (${customer.email}) ${kind === 'new' ? 'opened a request' : 'replied'}. ${ticketLine(t)}.`;
  const result = await sendEmail({
    to,
    subject: `[${t.ticketNumber}] ${heading}`,
    html: layout({
      preheader: excerpt(message, 120),
      heading,
      intro,
      quote: excerpt(message),
      cta: { label: 'Reply in Admin', href },
      footer: 'Reply from the Admin support page so the customer sees it in their account. Replying to this email does not reach them.',
    }),
    text: `${heading}\n\n${intro}\n\n${excerpt(message)}\n\nReply in Admin: ${href}`,
    tag: kind === 'new' ? 'support-new' : 'support-customer-reply',
  });
  if (result.status === 'failed') console.warn(`[support] team email for ${t.ticketNumber} failed: ${result.error}`);
}

/** Confirms to the customer that their request was received. */
export async function notifyCustomerReceived(t: TicketInfo, customer: { name: string; email: string }) {
  const href = `${siteUrl()}/support?ticket=${encodeURIComponent(t.ticketNumber)}`;
  const result = await sendEmail({
    to: customer.email,
    subject: `We've received your request ${t.ticketNumber}`,
    html: layout({
      preheader: `Your request "${t.subject}" has reached Vyntra Customer Service.`,
      heading: 'We have your request',
      intro: `Thanks for writing to us. Your request "${t.subject}" has reached our team, and we'll reply in your Vyntra account. We'll also email you when we do.`,
      cta: { label: 'View your request', href },
      footer: `${ticketLine(t)}. Please don't reply to this email; add any details to the request in your account instead.`,
    }),
    text: `We have your request\n\nYour request "${t.subject}" has reached our team. We'll reply in your Vyntra account and email you when we do.\n\n${ticketLine(t)}\nView it: ${href}`,
    tag: 'support-received',
  });
  if (result.status === 'failed') console.warn(`[support] receipt to ${maskEmail(customer.email)} failed: ${result.error}`);
}

/** Tells the customer that support replied. */
export async function notifyCustomerReply(t: TicketInfo, customer: { name: string; email: string }, message: string, resolved: boolean) {
  const href = `${siteUrl()}/support?ticket=${encodeURIComponent(t.ticketNumber)}`;
  const heading = resolved ? 'Your request is resolved' : 'We replied to your request';
  const result = await sendEmail({
    to: customer.email,
    subject: `[${t.ticketNumber}] ${heading}`,
    html: layout({
      preheader: excerpt(message, 120),
      heading,
      intro: `Here is our reply about "${t.subject}".`,
      quote: excerpt(message),
      cta: { label: resolved ? 'View request' : 'Reply in your account', href },
      footer: `${ticketLine(t)}. ${resolved ? 'If you still need help, reply in your account and the request reopens.' : "Please reply in your account; replies to this email don't reach us."}`,
    }),
    text: `${heading}\n\n${excerpt(message)}\n\n${ticketLine(t)}\nView it: ${href}`,
    tag: resolved ? 'support-resolved' : 'support-staff-reply',
  });
  if (result.status === 'failed') console.warn(`[support] reply email to ${maskEmail(customer.email)} failed: ${result.error}`);
}

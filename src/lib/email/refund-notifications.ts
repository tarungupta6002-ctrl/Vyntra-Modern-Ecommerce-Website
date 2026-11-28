import { prisma } from '@/lib/prisma';
import { maskPayoutDetails } from '@/lib/returns/payout-details';
import { sendEmail, maskEmail, type SendResult } from './send';
import { escapeHtml, formatRupees } from './order-templates';

/**
 * Customer email when a return is refunded:
 * - Cash on Delivery: "Refund sent" with the amount, where it went (masked) and the bank reference.
 * - Online payment: "Refund started" with how long the bank usually takes.
 * Call after the refund is recorded. Never throws.
 */

const C = { navy: '#131921', ink: '#0F1111', muted: '#565959', border: '#E3E6E6', bg: '#F3F4F4', accent: '#FEB800', link: '#007185', success: '#067D62' };

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export async function sendReturnRefundEmail(refundTransactionId: string): Promise<SendResult | null> {
  try {
    const tx = await prisma.refundTransaction.findUnique({
      where: { id: refundTransactionId },
      select: {
        amount: true,
        mode: true,
        gatewayReference: true,
        order: { select: { orderNumber: true, user: { select: { email: true, name: true } } } },
        returnRequest: {
          select: {
            orderItem: { select: { product: { select: { title: true } } } },
            refundPayoutDetail: { select: { method: true, upiId: true, accountNumber: true, ifsc: true } },
          },
        },
      },
    });
    const to = tx?.order.user?.email;
    if (!tx || !to) return { status: 'skipped', reason: 'refund or customer email not found' };

    const manual = tx.mode === 'MANUAL_BANK_TRANSFER';
    const amount = formatRupees(Number(tx.amount));
    const item = tx.returnRequest.orderItem.product?.title || 'your returned item';
    const payout = tx.returnRequest.refundPayoutDetail;
    const destination = manual ? (payout ? maskPayoutDetails(payout) : 'your bank account') : 'your original payment method';
    const name = (tx.order.user?.name || '').trim().split(/\s+/)[0];

    const subject = manual
      ? `Refund of ${amount} sent for order #${tx.order.orderNumber}`
      : `Refund of ${amount} started for order #${tx.order.orderNumber}`;
    const heading = manual ? 'Your refund has been sent' : 'Your refund has started';
    const intro = manual
      ? `We've sent ${amount} to ${destination} for ${item}.`
      : `We've refunded ${amount} to ${destination} for ${item}. Banks usually show it within 5–7 working days.`;
    const facts: [string, string][] = [
      ['Amount', amount],
      ['Sent to', destination],
      ...(manual && tx.gatewayReference ? ([['Bank reference (UTR)', tx.gatewayReference]] as [string, string][]) : []),
      ['Order', `#${tx.order.orderNumber}`],
    ];
    const help = manual
      ? "If it hasn't arrived within 2 working days, contact us with the bank reference above."
      : "If it hasn't arrived after 7 working days, contact us and we'll check with the bank.";

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid ${C.border};">
      <tr><td style="background:${C.navy};padding:18px 32px;"><span style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#fff;">VYNTRA</span><span style="color:${C.accent};font-size:22px;font-weight:bold;">.</span></td></tr>
      <tr><td style="padding:28px 32px 0;">
        <h1 style="margin:0 0 8px;font-size:24px;line-height:30px;color:${C.ink};">${escapeHtml(heading)}</h1>
        <p style="margin:0;font-size:15px;line-height:22px;color:${C.ink};">${name ? `Hi ${escapeHtml(name)}, ` : ''}${escapeHtml(intro)}</p>
      </td></tr>
      <tr><td style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${facts
          .map(
            ([k, v]) => `<tr><td style="padding:6px 0;font-size:13px;color:${C.muted};">${escapeHtml(k)}</td><td align="right" style="padding:6px 0;font-size:14px;font-weight:bold;color:${C.ink};">${escapeHtml(v)}</td></tr>`
          )
          .join('')}
      </table></td></tr>
      <tr><td style="padding:24px 32px 0;"><a href="${escapeHtml(siteUrl())}/account?tab=returns" style="display:inline-block;background:${C.accent};color:${C.ink};text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px;">View your returns</a></td></tr>
      <tr><td style="padding:28px 32px;"><div style="border-top:1px solid ${C.border};padding-top:16px;font-size:12px;line-height:18px;color:${C.muted};">
        ${escapeHtml(help)} <a href="${escapeHtml(siteUrl())}/support" style="color:${C.link};">Customer Service</a>
      </div></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

    const text = [heading, '', intro, '', ...facts.map(([k, v]) => `${k}: ${v}`), '', help, `${siteUrl()}/support`].join('\n');

    const result = await sendEmail({ to, subject, html, text, tag: manual ? 'refund-sent' : 'refund-started' });
    if (result.status === 'sent') console.info(`[email] refund for #${tx.order.orderNumber} sent to ${maskEmail(to)}`);
    return result;
  } catch (err: any) {
    console.error(`[email] refund email for ${refundTransactionId} failed:`, err?.message || err);
    return { status: 'failed', error: err?.message || 'unknown error' };
  }
}

/**
 * Once a Cash on Delivery return is fully refunded, its bank / UPI details are no longer needed:
 * clear them and keep only when that happened.
 */
export async function erasePayoutDetailsIfDone(returnRequestId: string): Promise<void> {
  try {
    const ret = await prisma.returnRequest.findUnique({ where: { id: returnRequestId }, select: { status: true } });
    if (ret?.status !== 'COMPLETED') return;
    await prisma.refundPayoutDetail.updateMany({
      where: { returnRequestId, erasedAt: null },
      data: { upiId: null, accountHolderName: null, accountNumber: null, ifsc: null, erasedAt: new Date() },
    });
  } catch (err: any) {
    console.error(`[refund] could not clear payout details for return ${returnRequestId}:`, err?.message || err);
  }
}

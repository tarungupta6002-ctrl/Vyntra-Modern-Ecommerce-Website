/**
 * Order email templates (HTML + plain text).
 * Table layout with inline styles so they render in Gmail, Outlook and mobile clients.
 * Every value that comes from users or vendors is HTML-escaped.
 */
import { DEFAULT_RETURN_WINDOW_DAYS } from '@/lib/policy-constants';

export type OrderEmailType = 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderEmailItem {
  title: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string | null;
  color?: string | null;
}

export interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  placedAt: Date;
  paymentMethod: string; // COD | UPI | CARD | NETBANKING
  paymentStatus: string; // PENDING | PAID | ...
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  address?: {
    fullName: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    phone?: string | null;
  } | null;
  shipments?: { courierPartner?: string | null; trackingNumber?: string | null }[];
  siteUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COLORS = {
  navy: '#131921',
  ink: '#0F1111',
  muted: '#565959',
  border: '#E3E6E6',
  bg: '#F3F4F4',
  accent: '#FEB800',
  link: '#007185',
  success: '#067D62',
  danger: '#B12704',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatRupees(amount: number): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function firstName(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0];
  if (!first) return 'there';
  // "TARUN" or "tarun" -> "Tarun"; mixed case like "McKenzie" is left alone.
  return first === first.toUpperCase() || first === first.toLowerCase()
    ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
    : first;
}

function paymentLabel(method: string, status: string, total: number): string {
  if (method === 'COD') return status === 'PAID' ? 'Cash on Delivery (paid)' : `Cash on Delivery: pay ${formatRupees(total)} on delivery`;
  const names: Record<string, string> = { UPI: 'UPI', CARD: 'Card', NETBANKING: 'Net Banking' };
  return `${names[method] || method}${status === 'PAID' ? ' (paid)' : ''}`;
}

/* ------------------------------------------------------------------ */
/* Per-type copy                                                       */
/* ------------------------------------------------------------------ */

interface Copy {
  subject: string;
  preheader: string;
  badge: { text: string; color: string };
  heading: string;
  intro: string;
  cta: { label: string; href: string };
  showTotals: boolean;
  showAddress: boolean;
  showTracking: boolean;
  note?: string;
}

function copyFor(type: OrderEmailType, d: OrderEmailData): Copy {
  const name = firstName(d.customerName);
  const tracking = `${d.siteUrl}/orders/${encodeURIComponent(d.orderNumber)}/tracking`;
  const orders = `${d.siteUrl}/orders`;
  switch (type) {
    case 'confirmed':
      return {
        subject: `Order confirmed: #${d.orderNumber}`,
        preheader: `Thanks for shopping with Vyntra. We've received your order of ${formatRupees(d.total)}.`,
        badge: { text: 'Order confirmed', color: COLORS.success },
        heading: `Thank you, ${name}!`,
        intro: "Your order is confirmed. We'll email you again as soon as it ships.",
        cta: { label: 'View your order', href: orders },
        showTotals: true,
        showAddress: true,
        showTracking: false,
      };
    case 'shipped':
      return {
        subject: `Shipped: your Vyntra order #${d.orderNumber} is on its way`,
        preheader: 'Your package has left the seller and is on its way to you.',
        badge: { text: 'Shipped', color: COLORS.link },
        heading: 'Your order is on its way',
        intro: `Good news, ${name}! Your package has been handed to the courier.`,
        cta: { label: 'Track your package', href: tracking },
        showTotals: false,
        showAddress: true,
        showTracking: true,
        note: d.paymentMethod === 'COD' && d.paymentStatus !== 'PAID'
          ? `Please keep ${formatRupees(d.total)} ready for Cash on Delivery.`
          : undefined,
      };
    case 'delivered':
      return {
        subject: `Delivered: your Vyntra order #${d.orderNumber}`,
        preheader: 'Your order has been delivered. We hope you love it!',
        badge: { text: 'Delivered', color: COLORS.success },
        heading: 'Your order has been delivered',
        intro: `We hope you love it, ${name}! Tell other shoppers what you think by rating your purchase.`,
        cta: { label: 'Rate your purchase', href: orders },
        showTotals: false,
        showAddress: false,
        showTracking: false,
        note: `Not quite right? Eligible items can be returned within ${DEFAULT_RETURN_WINDOW_DAYS} days of delivery from Your Orders.`,
      };
    case 'cancelled':
      return {
        subject: `Cancelled: your Vyntra order #${d.orderNumber}`,
        preheader: 'Your order has been cancelled.',
        badge: { text: 'Cancelled', color: COLORS.danger },
        heading: 'Your order has been cancelled',
        intro: `Hi ${name}, your order #${d.orderNumber} has been cancelled and won't be shipped.`,
        cta: { label: 'Continue shopping', href: d.siteUrl },
        showTotals: true,
        showAddress: false,
        showTracking: false,
        note: d.paymentMethod !== 'COD' && d.paymentStatus === 'PAID'
          ? 'You paid online for this order, so a refund to your original payment method is due. If you have any questions, please contact Customer Service.'
          : 'No payment was taken for this order.',
      };
  }
}

/* ------------------------------------------------------------------ */
/* HTML                                                                */
/* ------------------------------------------------------------------ */

function itemRows(items: OrderEmailItem[]): string {
  return items
    .map((it) => {
      const variant = [it.size && `Size: ${escapeHtml(it.size)}`, it.color && `Colour: ${escapeHtml(it.color)}`]
        .filter(Boolean)
        .join(' · ');
      const img = it.imageUrl && /^https:\/\//.test(it.imageUrl)
        ? `<img src="${escapeHtml(it.imageUrl)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:contain;border:1px solid ${COLORS.border};border-radius:6px;background:#fff;">`
        : `<div style="width:64px;height:64px;border:1px solid ${COLORS.border};border-radius:6px;background:${COLORS.bg};"></div>`;
      return `
        <tr>
          <td width="76" valign="top" style="padding:12px 12px 12px 0;border-bottom:1px solid ${COLORS.border};">${img}</td>
          <td valign="top" style="padding:12px 8px 12px 0;border-bottom:1px solid ${COLORS.border};font-size:14px;line-height:20px;color:${COLORS.ink};">
            ${escapeHtml(it.title)}
            <div style="font-size:12px;color:${COLORS.muted};margin-top:2px;">Qty ${it.quantity}${variant ? ` · ${variant}` : ''}</div>
          </td>
          <td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${COLORS.border};font-size:14px;font-weight:bold;color:${COLORS.ink};white-space:nowrap;">${formatRupees(it.totalPrice)}</td>
        </tr>`;
    })
    .join('');
}

function totalsRows(d: OrderEmailData): string {
  const row = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-size:${strong ? 15 : 13}px;color:${strong ? COLORS.ink : COLORS.muted};${strong ? 'font-weight:bold;' : ''}">${label}</td>
      <td align="right" style="padding:4px 0;font-size:${strong ? 15 : 13}px;color:${COLORS.ink};${strong ? 'font-weight:bold;' : ''}">${value}</td>
    </tr>`;
  return [
    row('Subtotal', formatRupees(d.subtotal)),
    d.discount > 0 ? row('Discount', `−${formatRupees(d.discount)}`) : '',
    row('Shipping', d.shippingFee > 0 ? formatRupees(d.shippingFee) : 'FREE'),
    d.tax > 0 ? row('Tax', formatRupees(d.tax)) : '',
    row('Order total', formatRupees(d.total), true),
  ].join('');
}

function section(title: string, body: string): string {
  return `
    <tr><td style="padding:20px 32px 0;">
      <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};margin-bottom:8px;">${title}</div>
      ${body}
    </td></tr>`;
}

export function renderOrderEmail(type: OrderEmailType, d: OrderEmailData): RenderedEmail {
  const c = copyFor(type, d);

  const tracked = (d.shipments || []).filter((s) => s.trackingNumber && s.trackingNumber !== 'See Vendor Shipments');
  const trackingHtml = tracked.length
    ? tracked
        .map(
          (s) => `<div style="font-size:14px;line-height:22px;color:${COLORS.ink};">
            ${escapeHtml(s.courierPartner || 'Courier')}: <strong style="font-family:Consolas,monospace;">${escapeHtml(s.trackingNumber)}</strong>
          </div>`
        )
        .join('')
    : `<div style="font-size:14px;color:${COLORS.muted};">Tracking details will appear on the tracking page shortly.</div>`;

  const a = d.address;
  const addressHtml = a
    ? `<div style="font-size:14px;line-height:21px;color:${COLORS.ink};">
        <strong>${escapeHtml(a.fullName)}</strong><br>
        ${escapeHtml(a.line1)}${a.line2 ? `, ${escapeHtml(a.line2)}` : ''}<br>
        ${escapeHtml(a.city)}, ${escapeHtml(a.state)} ${escapeHtml(a.postalCode)}
        ${a.phone ? `<br><span style="color:${COLORS.muted};">Phone: ${escapeHtml(a.phone)}</span>` : ''}
      </div>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${COLORS.border};">

        <tr><td style="background:${COLORS.navy};padding:18px 32px;">
          <span style="font-size:22px;font-weight:bold;letter-spacing:3px;color:#ffffff;">VYNTRA</span><span style="color:${COLORS.accent};font-size:22px;font-weight:bold;">.</span>
        </td></tr>

        <tr><td style="padding:28px 32px 0;">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${c.badge.color};color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(c.badge.text)}</span>
          <h1 style="margin:14px 0 8px;font-size:24px;line-height:30px;color:${COLORS.ink};">${escapeHtml(c.heading)}</h1>
          <p style="margin:0;font-size:15px;line-height:22px;color:${COLORS.ink};">${escapeHtml(c.intro)}</p>
          <p style="margin:12px 0 0;font-size:13px;color:${COLORS.muted};">
            Order <strong style="color:${COLORS.ink};">#${escapeHtml(d.orderNumber)}</strong> · Placed ${formatDate(d.placedAt)}
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px 0;">
          <a href="${escapeHtml(c.cta.href)}" style="display:inline-block;background:${COLORS.accent};color:${COLORS.ink};text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px;">${escapeHtml(c.cta.label)}</a>
        </td></tr>

        ${c.note ? `<tr><td style="padding:20px 32px 0;"><div style="background:#FFF8E5;border:1px solid #F5D98B;border-radius:8px;padding:12px 14px;font-size:13px;line-height:19px;color:${COLORS.ink};">${escapeHtml(c.note)}</div></td></tr>` : ''}

        ${c.showTracking ? section('Tracking', trackingHtml) : ''}

        ${section(
          `Items (${d.items.reduce((n, i) => n + i.quantity, 0)})`,
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows(d.items)}</table>`
        )}

        ${c.showTotals ? `<tr><td style="padding:12px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totalsRows(d)}</table>
          <div style="font-size:12px;color:${COLORS.muted};margin-top:6px;">Payment: ${escapeHtml(paymentLabel(d.paymentMethod, d.paymentStatus, d.total))}</div></td></tr>` : ''}

        ${c.showAddress && a ? section('Delivering to', addressHtml) : ''}

        <tr><td style="padding:28px 32px;">
          <div style="border-top:1px solid ${COLORS.border};padding-top:16px;font-size:12px;line-height:18px;color:${COLORS.muted};">
            Questions about your order? Visit <a href="${escapeHtml(d.siteUrl)}/support" style="color:${COLORS.link};">Customer Service</a>.<br>
            You're receiving this email because you placed an order on Vyntra.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    c.heading,
    '',
    c.intro,
    `Order #${d.orderNumber} · Placed ${formatDate(d.placedAt)}`,
    c.note ? `\n${c.note}` : '',
    c.showTracking
      ? '\nTracking:\n' + (tracked.length ? tracked.map((s) => `  ${s.courierPartner || 'Courier'}: ${s.trackingNumber}`).join('\n') : '  Tracking details will appear on the tracking page shortly.')
      : '',
    '\nItems:',
    ...d.items.map((i) => `  ${i.quantity} × ${i.title} — ${formatRupees(i.totalPrice)}`),
    c.showTotals ? `\nOrder total: ${formatRupees(d.total)}\nPayment: ${paymentLabel(d.paymentMethod, d.paymentStatus, d.total)}` : '',
    c.showAddress && a ? `\nDelivering to:\n  ${a.fullName}, ${a.line1}, ${a.city}, ${a.state} ${a.postalCode}` : '',
    `\n${c.cta.label}: ${c.cta.href}`,
    `\nQuestions? ${d.siteUrl}/support`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject: c.subject, html, text };
}

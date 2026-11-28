import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use | Vyntra',
  description: 'The terms for buying and selling on Vyntra: orders, fees, payments, cancellations, returns and refunds.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="28 November 2026"
      intro={
        <p>
          These terms apply when you use Vyntra to buy or sell. By creating an account or placing an order you agree to them, and
          to our{' '}
          <Link href="/privacy" className="text-[#007185] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      }
    >
      <LegalSection title="What Vyntra is">
        <p>
          Vyntra is a marketplace. Independent sellers list and sell their products on it; Vyntra runs the website, takes payment
          and handles customer support. Each product page shows who sells it. The seller is responsible for the product, its
          description and for shipping it.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          Keep your password private; you are responsible for orders placed from your account. Give accurate details, especially
          your delivery address and phone number. We may suspend accounts used for fraud or abuse.
        </p>
      </LegalSection>

      <LegalSection title="Prices and fees">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Prices are in Indian rupees and are set by the seller. The price you pay is the one shown at checkout.</li>
          <li>Delivery is free. Each order has a ₹49 packaging fee, and Cash on Delivery orders have an extra ₹49 COD fee. Both are shown before you pay.</li>
          <li>If a product is listed at a clearly wrong price, the seller or Vyntra may cancel the order and refund you in full.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Payment">
        <p>
          Online payments (UPI, cards, net banking) are processed by Razorpay. For Cash on Delivery, pay the courier when your
          order arrives. An order is confirmed only after payment succeeds or, for Cash on Delivery, after it is placed.
        </p>
      </LegalSection>

      <LegalSection title="Cancelling an order">
        <p>
          You can cancel from Your Orders until the order ships. If you paid online, the full amount, including the packaging fee,
          is refunded to your original payment method. Once an order has shipped it cannot be cancelled, but you can return
          eligible items after delivery.
        </p>
      </LegalSection>

      <LegalSection title="Returns and refunds">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Eligible items can be returned within 7 days of delivery. Each product page shows whether it can be returned.</li>
          <li>Damaged, defective or wrong items, and items not as described, qualify for a refund or replacement.</li>
          <li>For size, fit or preference reasons, eligible items can be exchanged rather than refunded.</li>
          <li>Innerwear, swimwear, cosmetics, perfumes, pierced jewellery and customised or made-to-order products cannot be returned for change of mind.</li>
          <li>The seller inspects returned items. If you disagree with their decision, you can raise a dispute and Vyntra will review it.</li>
          <li>Refunds go to the original payment method; banks usually show them 5–7 business days after they are issued. For Cash on Delivery orders we will contact you for bank or UPI details.</li>
          <li>For a return, the refund covers the price of the returned items. The packaging fee is not refunded.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Coupons">
        <p>
          Coupons apply only as described with them. VYNTRAFIRST gives 10% off your first order of ₹1,499 or more, up to ₹1,000,
          once per customer. Coupons have no cash value and cannot be combined unless we say so.
        </p>
      </LegalSection>

      <LegalSection title="Reviews">
        <p>
          Reviews must be about the product and based on your own purchase. We may decline or remove reviews that are abusive,
          misleading, off-topic or written for payment.
        </p>
      </LegalSection>

      <LegalSection title="Selling on Vyntra">
        <p>
          Sellers apply through{' '}
          <Link href="/become-seller" className="text-[#007185] hover:underline">
            Sell on Vyntra
          </Link>{' '}
          and may list products only after approval. Sellers must describe products accurately, keep stock and prices up to date,
          ship on time from their pickup address, and follow the return policy above. Vyntra keeps a commission on each sale, shown
          in Seller Central, and pays sellers for delivered, paid orders.
        </p>
      </LegalSection>

      <LegalSection title="Responsibility">
        <p>
          We work to keep the site available and product information accurate, but we cannot promise it will always be error-free.
          Nothing in these terms limits your rights under the Consumer Protection Act, 2019 or other Indian law.
        </p>
      </LegalSection>

      <LegalSection title="Law and disputes">
        <p>
          These terms are governed by the laws of India. Please contact us first so we can try to resolve any problem; you can also
          approach the consumer commission or courts with jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>We may update these terms. The date at the top shows the latest version, which applies to orders placed after it.</p>
      </LegalSection>
    </LegalPage>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection } from '@/components/legal/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vyntra',
  description: 'What personal data Vyntra collects, why, who it is shared with, and your rights.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="28 November 2026"
      intro={
        <p>
          This policy explains what personal data Vyntra collects when you shop or sell on Vyntra, why we use it, who we share it
          with and the choices you have. It is written to meet India&apos;s Digital Personal Data Protection Act, 2023.
        </p>
      }
    >
      <LegalSection title="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Account:</strong> your name, email address, mobile number (if you add one) and password. Passwords are stored by our sign-in provider in a form we cannot read.</li>
          <li><strong>Delivery addresses</strong> you save or use at checkout.</li>
          <li><strong>Orders:</strong> what you bought, prices, payment method and status, cancellations, returns and refunds.</li>
          <li><strong>Payments:</strong> card and UPI details are entered on Razorpay&apos;s checkout, not on Vyntra. We receive and keep only the payment reference and status.</li>
          <li><strong>What you write to us:</strong> product reviews, support requests and return reasons.</li>
          <li><strong>Sellers:</strong> store details, GST and PAN numbers, bank details for payouts and pickup addresses.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To create your account and sign you in.</li>
          <li>To take payment, deliver orders, and handle cancellations, returns and refunds.</li>
          <li>To send emails about your orders, returns, refunds and support requests.</li>
          <li>To publish reviews you choose to post, with your name.</li>
          <li>To pay sellers and keep records the law requires, such as invoices and tax records.</li>
          <li>To prevent fraud and misuse of the site.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it for advertising by other companies.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>The seller of each item</strong> receives your name, delivery address and phone number so they can pack and ship it.</li>
          <li><strong>Courier companies</strong> receive the same delivery details to deliver and, for returns, to pick up.</li>
          <li><strong>Razorpay</strong> processes online payments and refunds.</li>
          <li><strong>Supabase</strong> hosts our database and sign-in service.</li>
          <li><strong>Our email provider</strong> sends order and support emails on our behalf.</li>
          <li><strong>Government authorities</strong> when the law requires it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and your browser">
        <p>
          We use cookies only to keep you signed in. Your browser also stores your cart, wishlist, saved addresses and basic profile
          details so pages load quickly. We do not use advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep your account data while your account is open. Order, payment and invoice records are kept for as long as tax and
          accounting laws require, even after you close your account. Support requests are kept so we can refer back to them if the
          same problem comes up again.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>You can ask us to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>tell you what personal data we hold about you and who we have shared it with;</li>
          <li>correct or complete it (you can edit your name, phone and addresses in{' '}
            <Link href="/account?tab=profile" className="text-[#007185] hover:underline">your account</Link>);</li>
          <li>delete it, except records we must keep by law;</li>
          <li>nominate someone to act for you if you are unable to;</li>
          <li>hear a complaint, through our Grievance Officer below.</li>
        </ul>
        <p>
          Send these requests from{' '}
          <Link href="/support?topic=ACCOUNT" className="text-[#007185] hover:underline">Help &amp; Support</Link>. If you are not
          satisfied with our answer, you can complain to the Data Protection Board of India.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Data travels over encrypted connections. Access to customer data is limited to people who need it to run the store. No
          system is perfectly secure; if a breach affects your data, we will tell you and the Data Protection Board as the law
          requires.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>Vyntra is meant for adults. If you are under 18, use it with a parent or guardian.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>If we change how we use your data, we will update this page and change the date at the top.</p>
      </LegalSection>
    </LegalPage>
  );
}

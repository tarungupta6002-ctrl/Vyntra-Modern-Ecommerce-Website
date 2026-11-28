import React from 'react';
import Link from 'next/link';
import { publicSupportContact } from '@/lib/support/tickets';

/** Shared frame for Terms and Privacy: title, date, readable column, contact block. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  const contact = publicSupportContact();
  return (
    <div className="bg-[#F3F4F2] px-4 py-10 sm:px-6 lg:py-14">
      <article className="mx-auto max-w-[46rem] rounded-2xl bg-white p-6 text-[#0F1111] ring-1 ring-[#E3E6E6] sm:p-10">
        <h1 className="font-brand text-4xl font-semibold leading-none [font-stretch:80%] sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-[#565959]">Last updated {updated}</p>
        <div className="mt-6 text-[15px] leading-7 text-[#333]">{intro}</div>
        <div className="legal-body mt-8 space-y-8 text-[15px] leading-7 text-[#333]">{children}</div>

        <section className="mt-10 rounded-xl bg-[#F7F8F8] p-5 text-sm leading-6">
          <h2 className="text-base font-semibold text-[#0F1111]">Questions and complaints</h2>
          <p className="mt-1">
            Write to us from{' '}
            <Link href="/support" className="font-semibold text-[#007185] hover:underline">
              Help &amp; Support
            </Link>
            {contact.email && (
              <>
                {' '}or at{' '}
                <a href={`mailto:${contact.email}`} className="font-semibold text-[#007185] hover:underline">
                  {contact.email}
                </a>
              </>
            )}
            .
          </p>
          {contact.grievanceOfficer && (
            <p className="mt-2">
              Grievance Officer: {contact.grievanceOfficer.name}
              {contact.grievanceOfficer.designation ? `, ${contact.grievanceOfficer.designation}` : ''}
              {contact.grievanceOfficer.email && (
                <>
                  {' '}
                  (
                  <a href={`mailto:${contact.grievanceOfficer.email}`} className="text-[#007185] hover:underline">
                    {contact.grievanceOfficer.email}
                  </a>
                  )
                </>
              )}
              . Complaints are acknowledged within 48 hours and resolved within one month.
            </p>
          )}
        </section>
      </article>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold text-[#0F1111]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

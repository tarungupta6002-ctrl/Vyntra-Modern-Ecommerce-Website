import React from 'react';
import { RotateCcw } from 'lucide-react';

export function CheckoutTrustBanner() {
  return (
    <div className="p-4 bg-surface-container rounded-xl flex items-center gap-3 border border-surface-container">
      <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary-container flex items-center justify-center flex-shrink-0">
        <RotateCcw className="h-5 w-5" />
      </div>
      <div className="text-xs">
        <span className="font-headline font-bold text-on-surface block">
          7-Day Hassle-Free Returns &amp; Exchange
        </span>
        <span className="text-on-surface-variant">
          Complimentary doorstep pickup if sizing doesn&apos;t fit like a dream.
        </span>
      </div>
    </div>
  );
}

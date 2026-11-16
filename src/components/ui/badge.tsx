import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'deal' | 'trust' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-bold uppercase tracking-wider rounded-[4px] transition-colors select-none';

  const variants = {
    primary: 'bg-[#FEF8E7] text-[#0F1111] border border-[#FCD200]',
    deal: 'bg-[#CC0C39] text-white shadow-sm',
    trust: 'bg-[#E7F4F5] text-[#007185] border border-[#BDE3E8]',
    neutral: 'bg-[#F0F2F2] text-[#0F1111]',
    outline: 'border border-[#D5D9D9] bg-white text-[#565959]',
  };

  const sizes = {
    sm: 'text-[10px] leading-3 px-2 py-0.5',
    md: 'text-xs leading-4 px-2.5 py-1',
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

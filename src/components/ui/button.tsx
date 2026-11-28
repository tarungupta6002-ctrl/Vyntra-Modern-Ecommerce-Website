import * as React from 'react';
import { cn } from '@/lib/utils';

import { CometSpinner } from '@/components/ui/loading-spinner';
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'mint' | 'addToCart' | 'buyNow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9900] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variants = {
      // Primary maps to Amazon Yellow Add-to-Cart
      primary:
        'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-full text-[14px] font-normal shadow-sm active:scale-[0.99]',
      addToCart:
        'bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] border border-[#FCD200] rounded-full text-[14px] font-normal shadow-sm active:scale-[0.99]',
      // Buy Now maps to Amazon Orange
      buyNow:
        'bg-[#FF9900] hover:bg-[#FA8900] text-[#0F1111] border border-[#FF8F00] rounded-full text-[14px] font-normal shadow-sm active:scale-[0.99]',
      // Secondary maps to White button with light gray border
      secondary:
        'bg-white hover:bg-[#F7FAFA] text-[#0F1111] border border-[#D5D9D9] font-medium shadow-sm hover:border-[#A6A6A6]',
      outline:
        'border border-[#D5D9D9] bg-white text-[#0F1111] hover:bg-[#F7FAFA] hover:border-[#A6A6A6]',
      ghost:
        'bg-transparent text-[#007185] hover:text-[#C45500] hover:underline',
      mint:
        'bg-[#E7F4F5] text-[#007185] hover:bg-[#D5EEF0] font-semibold border border-[#BDE3E8]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-9 px-4 text-xs font-semibold rounded-md gap-2',
      lg: 'h-11 px-6 text-sm font-bold rounded-md gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-md',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <CometSpinner className="h-4 w-4 inline-block text-current" decorative />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

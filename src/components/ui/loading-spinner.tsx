import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Vyntra's loading indicator: the loading-ui comet, a head whose tail opens and closes as it
 * circles (1.7s). Styles live in globals.css (.comet-spinner). Sizes: h-12 w-12 (48px) for page
 * and section loaders, h-4 w-4 (16px) inside buttons and next to text. It takes the text
 * colour, so inside a button it matches the button's text; without a text colour it is teal.
 */
export function CometSpinner({
  className,
  label = 'Loading',
  decorative = false,
  style,
}: {
  className?: string;
  /** What is loading, for screen readers. */
  label?: string;
  /** Next to visible text such as "Saving…": hide it from screen readers. */
  decorative?: boolean;
  style?: React.CSSProperties;
}) {
  const classes = className || '';
  const hasSize = /(^|\s)(h-|w-|size-)/.test(classes);
  const hasColor = /(^|\s)([a-z]+:)*text-(?!(xs|sm|base|lg|xl|[2-9]xl|left|right|center|justify|start|end|wrap|nowrap|balance|ellipsis|clip)\b)/.test(classes);
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      className={cn('comet-spinner', !hasSize && 'h-12 w-12', !hasColor && 'text-[#007185]', classes)}
      style={style}
    >
      <span className="comet-spinner__orbit">
        <span className="comet-spinner__head" />
      </span>
    </span>
  );
}

// Page and section loaders are 48px; the presets are kept for older callers.
const SIZE_CLASS: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'h-4 w-4',
  md: 'h-12 w-12',
  lg: 'h-12 w-12',
  xl: 'h-12 w-12',
};

export interface LoadingSpinnerProps {
  /** Preset ('sm' 16px; 'md', 'lg' and 'xl' 48px) or pixels. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Colour override (defaults to the store teal). */
  color?: string;
  /** Kept for older callers; the comet has no second colour. */
  endColor?: string;
  /** Kept for older callers. */
  strokeWidth?: number;
  className?: string;
}

/** The comet at a preset size (older name, kept so existing pages keep working). */
export function LoadingSpinner({ size = 'lg', color, className = '' }: LoadingSpinnerProps) {
  const sizeClass = typeof size === 'number' ? '' : SIZE_CLASS[size] || SIZE_CLASS.lg;
  const style: React.CSSProperties = {
    ...(typeof size === 'number' ? { width: size, height: size } : {}),
    ...(color ? { color } : {}),
  };
  return <CometSpinner className={cn(sizeClass, typeof size === 'number' && 'h-auto', className)} style={style} />;
}

export interface PageLoaderProps {
  /** Optional message under the spinner. */
  message?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  color?: string;
  /** Minimum container height. */
  minHeight?: string;
  className?: string;
}

/** A centred loading state for a whole page or panel. */
export function PageLoader({ message, subtitle, size = 'lg', color, minHeight = 'min-h-[65vh]', className = '' }: PageLoaderProps) {
  return (
    <div className={cn('flex w-full flex-col items-center justify-center', minHeight, className)} aria-live="polite">
      <LoadingSpinner size={size} color={color} />
      {message && <p className="mt-4 text-sm font-medium text-[#0F1111]">{message}</p>}
      {subtitle && <p className="mt-1 text-xs text-[#565959]">{subtitle}</p>}
    </div>
  );
}

/** A full-screen overlay while something important is being saved. */
export function FullPageLoader({ message = 'Saving…', subtitle }: { message?: string; subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/85">
      <LoadingSpinner size="xl" />
      {message && <p className="mt-4 text-base font-semibold text-[#0F1111]">{message}</p>}
      {subtitle && <p className="mt-1 text-xs text-[#565959]">{subtitle}</p>}
    </div>
  );
}

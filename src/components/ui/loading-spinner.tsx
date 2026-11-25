'use client';

import React, { useId } from 'react';

export interface LoadingSpinnerProps {
  /** Size in pixels or standard presets ('sm' = 24, 'md' = 36, 'lg' = 52, 'xl' = 64) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Primary vibrant start color (defaults to Vyntra warm orange #FF7A00 matching modern marketplaces) */
  color?: string;
  /** Secondary end gradient color */
  endColor?: string;
  /** Thickness of the spinner stroke in pixels */
  strokeWidth?: number;
  /** Custom extra classes */
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 24, stroke: 2.5 },
  md: { px: 36, stroke: 3 },
  lg: { px: 52, stroke: 3.5 },
  xl: { px: 64, stroke: 4 },
};

/**
 * Modern minimalist circular arc spinner with smooth fading tail,
 * perfectly matching clean production e-commerce loaders.
 */
export function LoadingSpinner({
  size = 'lg',
  color = '#FF7A00',
  endColor = '#FFB366',
  strokeWidth,
  className = '',
}: LoadingSpinnerProps) {
  const gradientId = useId();

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size]?.px || 52;
  const stroke = strokeWidth || (typeof size === 'number' ? Math.max(2, Math.round(dimension / 15)) : SIZE_MAP[size]?.stroke || 3.5);

  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc length covers ~70% of the circle, smooth fading tail
  const dashArray = `${circumference * 0.72} ${circumference * 0.28}`;

  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        viewBox={`0 0 ${dimension} ${dimension}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        style={{
          width: dimension,
          height: dimension,
          animationDuration: '800ms',
          animationTimingFunction: 'linear',
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="50%" stopColor={endColor} stopOpacity="0.75" />
            <stop offset="100%" stopColor={endColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Faint subtle background track for smooth contrast */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeOpacity="0.08"
          fill="none"
        />

        {/* Smooth gradient spinning arc with rounded head */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          fill="none"
        />
      </svg>
    </div>
  );
}

export interface PageLoaderProps {
  /** Optional message displayed below the spinner */
  message?: string;
  /** Sub-message or subtitle */
  subtitle?: string;
  /** Spinner size preset */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Spinner color override */
  color?: string;
  /** Minimum container height */
  minHeight?: string;
  /** Custom container className */
  className?: string;
}

/**
 * Centered page-level loading state with clean white backdrop,
 * exactly matching the IndeStack minimalist loading design.
 */
export function PageLoader({
  message,
  subtitle,
  size = 'lg',
  color = '#FF7A00',
  minHeight = 'min-h-[65vh]',
  className = '',
}: PageLoaderProps) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center bg-white ${minHeight} ${className}`}
      aria-live="polite"
    >
      <LoadingSpinner size={size} color={color} />
      {message && (
        <p className="mt-4 text-sm font-semibold text-[#0F1111] animate-pulse">
          {message}
        </p>
      )}
      {subtitle && (
        <p className="mt-1 text-xs text-[#565959]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Full viewport overlay loader for form submissions or critical operations.
 */
export function FullPageLoader({
  message = 'Processing...',
  subtitle = 'Please wait while we update your catalog',
}: {
  message?: string;
  subtitle?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
      <LoadingSpinner size="xl" color="#FF7A00" />
      {message && (
        <p className="mt-4 text-base font-bold text-[#0F1111]">
          {message}
        </p>
      )}
      {subtitle && (
        <p className="mt-1 text-xs text-[#565959]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

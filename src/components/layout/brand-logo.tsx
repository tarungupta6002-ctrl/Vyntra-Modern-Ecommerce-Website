import React from 'react';
import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  variant?: 'light' | 'dark';
  asLink?: boolean;
  href?: string;
}

export function BrandLogo({
  className = 'h-9 w-auto',
  showTagline = true,
  variant = 'light',
  asLink = true,
  href = '/',
}: BrandLogoProps) {
  const isLight = variant === 'light';
  const textColor = isLight ? '#FFFFFF' : '#0F1111';
  const accentColor = '#FF9900';
  const taglineColor = isLight ? '#CCCCCC' : '#565959';

  const svgContent = (
    <svg
      viewBox="0 0 480 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="vynGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007185" />
          <stop offset="100%" stopColor="#FF9900" />
        </linearGradient>
        <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#FFD814" />
        </linearGradient>
      </defs>

      {/* Brand Icon: Stylized Origami 'V' */}
      <g transform="translate(16, 18)">
        <rect width="84" height="84" rx="12" fill={isLight ? '#232F3E' : '#EAEDED'} stroke={isLight ? '#3b4554' : '#D5D9D9'} strokeWidth="1.5" />
        <path
          d="M 28 26 L 42 60 L 56 26"
          stroke="url(#vynGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 42 48 L 58 26 L 68 44 L 52 66 Z"
          fill="url(#coralGrad)"
          opacity="0.95"
        />
        <circle cx="42" cy="30" r="4.5" fill="#FFD814" />
      </g>

      {/* Wordmark Text */}
      <g transform="translate(122, 68)">
        <text
          fontFamily="Arial, Helvetica, sans-serif"
          fontWeight="900"
          fontSize="46"
          letterSpacing="3"
          fill={textColor}
        >
          VYN<tspan fill={accentColor}>TRA</tspan>
        </text>
        <circle cx="272" cy="-32" r="5.5" fill="#FFD814" />
        {showTagline && (
          <text
            x="2"
            y="24"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="600"
            fontSize="11"
            letterSpacing="4.5"
            fill={taglineColor}
          >
            DISCOVER MORE. LIVE BETTER.
          </text>
        )}
      </g>
    </svg>
  );

  if (!asLink) {
    return (
      <span className="inline-flex items-center gap-2 group select-none pointer-events-none">
        {svgContent}
      </span>
    );
  }

  return (
    <Link href={href} className="inline-flex items-center gap-2 group select-none">
      {svgContent}
    </Link>
  );
}

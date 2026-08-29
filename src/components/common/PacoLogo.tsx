import React from 'react';

interface PacoLogoProps {
  size?: 'sm' | 'md' | 'lg' | number;
  showText?: boolean;
  className?: string;
}

export function PacoLogoIcon({ size = 28, className = '' }: { size?: number | string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Left Book Page Gradient */}
        <linearGradient id="blueBookGrad" x1="15" y1="20" x2="60" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E40AF" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Right Book Page & Scale Gold Gradient */}
        <linearGradient id="goldGrad" x1="60" y1="20" x2="105" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>

        {/* Scale Shadow / Glow */}
        <linearGradient id="scaleBlueGrad" x1="30" y1="35" x2="55" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>

      {/* --- Left Book Layer (Blue) --- */}
      <path
        d="M60 84C45 81 26 84 15 88V34C26 30 45 28 60 32V84Z"
        fill="url(#blueBookGrad)"
      />
      <path
        d="M60 84C45 81 26 84 15 88"
        stroke="#172554"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M20 93C30 90 45 88 60 90"
        stroke="#1E40AF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* --- Right Book Layer (Gold) --- */}
      <path
        d="M60 84C75 81 94 84 105 88V34C94 30 75 28 60 32V84Z"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M60 90C75 88 90 90 100 93"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* --- Book Center Spine --- */}
      <path
        d="M60 22V86"
        stroke="#1E3A8A"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <polygon points="60,18 56,26 64,26" fill="#1E3A8A" />

      {/* --- Scales of Justice (Left & Right) --- */}
      {/* Top Crossbar */}
      <path
        d="M32 40C42 36 50 36 60 38C70 36 78 36 88 40"
        stroke="#D97706"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="38" r="3.5" fill="#D97706" />

      {/* Left Pan Chains & Pan (Blue / Steel) */}
      <line x1="32" y1="40" x2="25" y2="56" stroke="#2563EB" strokeWidth="2" />
      <line x1="32" y1="40" x2="39" y2="56" stroke="#2563EB" strokeWidth="2" />
      <path
        d="M23 56C23 63 39 63 41 56H23Z"
        fill="url(#scaleBlueGrad)"
      />

      {/* Right Pan Chains & Pan (Gold) */}
      <line x1="88" y1="40" x2="81" y2="56" stroke="#D97706" strokeWidth="2" />
      <line x1="88" y1="40" x2="95" y2="56" stroke="#D97706" strokeWidth="2" />
      <path
        d="M79 56C79 63 95 63 97 56H79Z"
        fill="url(#goldGrad)"
      />

      {/* --- Tech Circuit Branch (Bottom Left) --- */}
      {/* Line 1 */}
      <path
        d="M30 92L20 102H14"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="102" r="3" fill="#0284C7" />

      {/* Line 2 */}
      <path
        d="M44 91L34 105H26"
        stroke="#1E40AF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="105" r="3" fill="#1E40AF" />

      {/* Line 3 (Gold) */}
      <path
        d="M56 93L48 109H42"
        stroke="#D97706"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="109" r="2.5" fill="#D97706" />
    </svg>
  );
}

export function PacoLogo({ size = 'md', showText = true, className = '' }: PacoLogoProps) {
  let iconPixel = 30;
  let textSize = 'text-sm';
  let pacoSize = 'text-base';

  if (typeof size === 'number') {
    iconPixel = size;
  } else if (size === 'sm') {
    iconPixel = 24;
    textSize = 'text-xs';
    pacoSize = 'text-sm';
  } else if (size === 'lg') {
    iconPixel = 42;
    textSize = 'text-lg';
    pacoSize = 'text-xl';
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PacoLogoIcon size={iconPixel} className="shrink-0 drop-shadow-sm" />
      {showText && (
        <div className="flex items-center gap-1.5 select-none leading-none">
          <span className={`font-extrabold tracking-tight text-blue-600 font-sans ${pacoSize}`}>
            PACO
          </span>
          <span className={`font-bold tracking-tight text-slate-900 font-sans ${textSize}`}>
            LegalBook
          </span>
        </div>
      )}
    </div>
  );
}

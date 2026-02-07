import React, { forwardRef } from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const Logo = forwardRef<SVGSVGElement, LogoProps>(({ size, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size || "24"}
    height={size || "24"}
    viewBox="0 0 24 24"
    {...props}
  >
    <defs>
      <radialGradient id="paleocore-logo-glow" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="white" stopOpacity="0.5" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </radialGradient>
      
      <path id="paleocore-logo-spike" d="M11.5 7.5 L12.5 7.5 L12 2 Z" />
      
      <filter id="paleocore-logo-blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
      </filter>
    </defs>

    <g fill="currentColor">
      {/* Background/Shadow Layer for spikes */}
      <g opacity="0.5" filter="url(#paleocore-logo-blur)">
        <use href="#paleocore-logo-spike" />
        <use href="#paleocore-logo-spike" transform="rotate(45 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(90 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(135 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(180 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(225 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(270 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(315 12 12)" />
      </g>
      
      {/* Main spikes */}
      <g>
        <use href="#paleocore-logo-spike" />
        <use href="#paleocore-logo-spike" transform="rotate(45 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(90 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(135 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(180 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(225 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(270 12 12)" />
        <use href="#paleocore-logo-spike" transform="rotate(315 12 12)" />
      </g>

      {/* Sphere base color */}
      <circle cx="12" cy="12" r="4.5" />
    </g>
    
    {/* Sphere glossy highlight */}
    <circle cx="12" cy="12" r="4.5" fill="url(#paleocore-logo-glow)" />
    
  </svg>
));

Logo.displayName = 'Logo';

export default Logo;
